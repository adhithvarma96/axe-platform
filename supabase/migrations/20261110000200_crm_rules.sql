-- Axe Realty OS, Phase 2/3 rules (SPEC 7.2, 7.4, 7.8, 7.9):
--   pipeline gates enforced at the database, viewing outcomes moving leads forward,
--   the commission engine on closings, and what a closing does to its property and lead.

-- ---------------------------------------------------------------------------
-- Pipeline order. Lost and Dormant are exits, not steps (rank 0).
-- ---------------------------------------------------------------------------
create or replace function app.stage_rank(s public.pipeline_status)
returns int language sql immutable set search_path = ''
as $$
  select case s
    when 'new' then 1 when 'contacted' then 2 when 'viewing_scheduled' then 3 when 'viewing_completed' then 4
    when 'ongoing_negotiations' then 5 when 'deposit_paid' then 6 when 'documentation_ready' then 7 when 'closed_won' then 8
    else 0 end
$$;

-- Gate items still unticked for entering a stage (every gate up to and including that stage).
create or replace function app.gate_missing(p_lead uuid, p_to public.pipeline_status)
returns text[] language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(g.label order by g.gate, g.sort_order), '{}')
  from public.gate_items g
  where g.active and g.deleted_at is null
    and app.stage_rank(g.required_for) > 0
    and app.stage_rank(g.required_for) <= app.stage_rank(p_to)
    and not exists (select 1 from public.lead_gate_ticks t where t.lead_id = p_lead and t.gate_item_key = g.key)
$$;

-- ---------------------------------------------------------------------------
-- 7.8 Gates: block the move at the server. Super Admin may override with a reason
-- (set by public.move_lead); the closing engine may set Closed Won (7.2).
-- ---------------------------------------------------------------------------
create or replace function app.guard_pipeline()
returns trigger language plpgsql set search_path = ''
as $$
declare
  missing text[];
  override text := nullif(current_setting('app.gate_override_reason', true), '');
  by_closing boolean := coalesce(current_setting('app.closing_engine', true), '') = 'on';
begin
  if new.pipeline_status is not distinct from old.pipeline_status then return new; end if;
  if new.pipeline_status = 'lost' and new.lost_reason_id is null then
    raise exception 'Choose a lost reason before marking this lead Lost.' using errcode = 'P0001';
  end if;
  if by_closing then return new; end if;
  missing := app.gate_missing(new.id, new.pipeline_status);
  if cardinality(missing) > 0 then
    if override is not null and app.is_admin() then return new; end if;
    raise exception 'GATE: Can''t move to % yet. Missing: %', replace(new.pipeline_status::text, '_', ' '), array_to_string(missing, '; ')
      using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger t20_guard_pipeline before update of pipeline_status on public.leads
  for each row execute function app.guard_pipeline();

-- New leads start at New or Contacted; anything further goes through the gates.
create or replace function app.guard_pipeline_insert()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if app.stage_rank(new.pipeline_status) > 4 and auth.uid() is not null then
    raise exception 'A new lead starts at New, Contacted or a viewing stage; move it on from the lead page.' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger t20_guard_pipeline_insert before insert on public.leads
  for each row execute function app.guard_pipeline_insert();

-- Stage history keeps the override reason.
create or replace function app.record_stage_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.lead_stage_history (lead_id, from_status, to_status, changed_by, changed_at)
    values (new.id, null, new.pipeline_status, coalesce(auth.uid(), new.created_by), new.created_at);
  elsif new.pipeline_status is distinct from old.pipeline_status then
    insert into public.lead_stage_history (lead_id, from_status, to_status, changed_by, override_reason)
    values (new.id, old.pipeline_status, new.pipeline_status, auth.uid(),
            nullif(current_setting('app.gate_override_reason', true), ''));
  end if;
  return new;
end $$;

-- Logs a blocked attempt and tells every active Super Admin (email goes from the app).
create or replace function app.log_gate_breach(p_lead uuid, p_to public.pipeline_status, p_missing text[])
returns void language plpgsql security definer set search_path = ''
as $$
declare
  l record;
begin
  select lead_code, name into l from public.leads where id = p_lead;
  insert into public.gate_breach_attempts (lead_id, attempted_status, missing_items, attempted_by)
  values (p_lead, p_to, p_missing, auth.uid());
  insert into public.notifications (recipient_agent_id, kind, title, body, link)
  select a.id, 'gate_breach',
         format('Gate blocked: %s tried to move %s', coalesce((select full_name from public.agents where user_id = auth.uid()), 'Someone'), coalesce(l.lead_code, 'a lead')),
         format('%s → %s. Missing: %s', l.name, replace(p_to::text, '_', ' '), array_to_string(p_missing, '; ')),
         format('/leads/%s', coalesce(l.lead_code, p_lead::text))
  from public.agents a where a.role = 'super_admin' and a.status = 'active' and a.deleted_at is null;
end $$;

-- The one way the app moves a lead: checks the gates first, logs a blocked attempt, then updates.
-- Runs as the caller, so row-level security still decides who may update the lead.
create or replace function public.move_lead(
  p_lead uuid, p_to public.pipeline_status, p_lost_reason uuid default null, p_override_reason text default null
) returns jsonb language plpgsql set search_path = ''
as $$
declare
  missing text[];
  cur public.pipeline_status;
begin
  select pipeline_status into cur from public.leads where id = p_lead and deleted_at is null;
  if cur is null then return jsonb_build_object('ok', false, 'error', 'Lead not found.'); end if;
  if cur = p_to then return jsonb_build_object('ok', true); end if;
  if p_to = 'lost' and p_lost_reason is null then
    return jsonb_build_object('ok', false, 'error', 'Choose a lost reason.');
  end if;
  missing := app.gate_missing(p_lead, p_to);
  if cardinality(missing) > 0 then
    if nullif(trim(p_override_reason), '') is not null and app.is_admin() then
      perform set_config('app.gate_override_reason', trim(p_override_reason), true);
    else
      perform app.log_gate_breach(p_lead, p_to, missing);
      return jsonb_build_object('ok', false, 'missing', to_jsonb(missing));
    end if;
  end if;
  update public.leads
     set pipeline_status = p_to,
         lost_reason_id = case when p_to = 'lost' then p_lost_reason else lost_reason_id end
   where id = p_lead;
  if not found then return jsonb_build_object('ok', false, 'error', 'You don''t have permission to move this lead.'); end if;
  perform set_config('app.gate_override_reason', '', true);
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.move_lead(uuid, public.pipeline_status, uuid, text) to authenticated;

-- Super Admin resets a recycled lead's checklist (7.8: ticks are otherwise sticky).
create or replace function app.guard_gate_untick()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if not app.is_admin() and auth.uid() is not null then
    raise exception 'Gate items stay ticked. Ask a Super Admin to reset the checklist.' using errcode = '42501';
  end if;
  return old;
end $$;

create trigger t20_guard_untick before delete on public.lead_gate_ticks
  for each row execute function app.guard_gate_untick();

create or replace function app.stamp_gate_tick()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.ticked_by := coalesce(new.ticked_by, auth.uid());
  new.ticked_at := now();
  return new;
end $$;

create trigger t10_stamp_tick before insert on public.lead_gate_ticks
  for each row execute function app.stamp_gate_tick();

-- ---------------------------------------------------------------------------
-- 7.4 Viewing outcome -> lead stage, forward only.
-- ---------------------------------------------------------------------------
create or replace function app.viewing_moves_lead()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  cur public.pipeline_status;
  agent uuid;
  target public.pipeline_status;
  today date := (now() at time zone 'Asia/Colombo')::date;
begin
  if new.lead_id is null or new.deleted_at is not null then return new; end if;
  if tg_op = 'UPDATE' and new.outcome is not distinct from old.outcome and new.date is not distinct from old.date
     and new.lead_id is not distinct from old.lead_id then return new; end if;
  select pipeline_status, assigned_agent_id into cur, agent from public.leads where id = new.lead_id and deleted_at is null;
  if cur is null or cur = 'closed_won' then return new; end if;

  target := case new.outcome
    when 'pending' then case when new.date > today then 'viewing_scheduled' else 'viewing_completed' end
    when 'interested' then 'viewing_completed'
    when 'wants_second_viewing' then 'viewing_scheduled'
    when 'made_offer' then 'ongoing_negotiations'
    else null end::public.pipeline_status;
  if target is null or app.stage_rank(target) <= app.stage_rank(cur) then return new; end if;

  if cardinality(app.gate_missing(new.lead_id, target)) > 0 then
    insert into public.tasks (title, details, due_on, assignee_agent_id, lead_id, viewing_id, property_id)
    values ('Send the offer, tick Gate 1, then advance the lead',
            'The viewing was marked Made Offer. Send the offer on the Axe Realty template, tick "Offer sent" on the lead, then move it to Ongoing Negotiations.',
            today, coalesce(agent, new.conducted_by_agent_id), new.lead_id, new.id, new.property_id);
    return new;
  end if;
  update public.leads set pipeline_status = target where id = new.lead_id;
  return new;
end $$;

create trigger t70_viewing_moves_lead after insert or update on public.viewings
  for each row execute function app.viewing_moves_lead();

-- ---------------------------------------------------------------------------
-- 7.9 Commission engine. Runs before every save of a closing.
-- ---------------------------------------------------------------------------
create or replace function app.commission_engine()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  sched public.commission_schedules;
  ld record; pr record;
  lead_ped date; list_ped date;
  r_lead record; r_list record;
  base numeric;
  rate numeric := new.usd_lkr_rate;
begin
  -- schedule effective on the closing date (snapshot; re-picked if the date changes)
  if new.commission_schedule_id is null or (tg_op = 'UPDATE' and new.closing_date is distinct from old.closing_date) then
    select * into sched from public.commission_schedules
     where deleted_at is null and effective_from <= new.closing_date and (effective_to is null or effective_to >= new.closing_date)
     order by effective_from desc limit 1;
    new.commission_schedule_id := sched.id;
  end if;

  select * into ld from public.leads where id = new.lead_id;
  select * into pr from public.properties where id = new.property_id;

  -- sourcing snapshots from the lead and property, taken once (or when the link changes)
  if new.lead_sourcing_model is null or (tg_op = 'UPDATE' and new.lead_id is distinct from old.lead_id and new.lead_sourcing_model is not distinct from old.lead_sourcing_model) then
    new.lead_sourcing_model := coalesce(ld.sourcing_model, new.lead_sourcing_model);
  end if;
  if new.listing_sourcing_model is null or (tg_op = 'UPDATE' and new.property_id is distinct from old.property_id and new.listing_sourcing_model is not distinct from old.listing_sourcing_model) then
    new.listing_sourcing_model := coalesce(pr.sourcing_model, new.listing_sourcing_model);
  end if;
  new.lead_side_referral_partner_id := coalesce(new.lead_side_referral_partner_id, case when new.lead_sourcing_model in ('company_via_referrer', 'agent_via_referrer') then ld.referral_partner_id end);
  new.listing_side_referral_partner_id := coalesce(new.listing_side_referral_partner_id, case when new.listing_sourcing_model in ('company_via_referrer', 'agent_via_referrer') then pr.referral_partner_id end);

  -- tenure and owner exemption per side
  select probation_end_date, commission_exempt into lead_ped, new.lead_agent_exempt from public.agent_hr where agent_id = new.lead_side_agent_id;
  select probation_end_date, commission_exempt into list_ped, new.listing_agent_exempt from public.agent_hr where agent_id = new.listing_side_agent_id;
  new.lead_agent_exempt := coalesce(new.lead_agent_exempt, false);
  new.listing_agent_exempt := coalesce(new.listing_agent_exempt, false);
  new.lead_agent_tenure := case when lead_ped is not null and new.closing_date <= lead_ped then 'probation' else 'confirmed' end;
  new.listing_agent_tenure := case when list_ped is not null and new.closing_date <= list_ped then 'probation' else 'confirmed' end;

  select * into r_lead from public.commission_schedule_rates where schedule_id = new.commission_schedule_id and sourcing_model = new.lead_sourcing_model and tenure = new.lead_agent_tenure;
  select * into r_list from public.commission_schedule_rates where schedule_id = new.commission_schedule_id and sourcing_model = new.listing_sourcing_model and tenure = new.listing_agent_tenure;

  -- per-side rates: no agent or an exempt agent -> the agent's points go to Axe; referral fees come out of Axe's share
  if r_lead.schedule_id is not null then
    new.lead_referrer_rate := r_lead.referrer_rate;
    new.lead_agent_rate := case when new.lead_side_agent_id is null or new.lead_agent_exempt then 0 else r_lead.agent_rate end;
    new.lead_axe_rate := 50 - new.lead_agent_rate - new.lead_referrer_rate;
  else
    new.lead_agent_rate := null; new.lead_referrer_rate := null; new.lead_axe_rate := null;
  end if;
  if r_list.schedule_id is not null then
    new.listing_referrer_rate := r_list.referrer_rate;
    new.listing_agent_rate := case when new.listing_side_agent_id is null or new.listing_agent_exempt then 0 else r_list.agent_rate end;
    new.listing_axe_rate := 50 - new.listing_agent_rate - new.listing_referrer_rate;
  else
    new.listing_agent_rate := null; new.listing_referrer_rate := null; new.listing_axe_rate := null;
  end if;

  base := new.our_commission;
  new.lead_agent_payout := round(base * new.lead_agent_rate / 100, 0);
  new.lead_referrer_payout := round(base * new.lead_referrer_rate / 100, 0);
  new.lead_axe_payout := round(base * new.lead_axe_rate / 100, 0);
  new.listing_agent_payout := round(base * new.listing_agent_rate / 100, 0);
  new.listing_referrer_payout := round(base * new.listing_referrer_rate / 100, 0);
  new.listing_axe_payout := round(base * new.listing_axe_rate / 100, 0);
  new.agent_total := coalesce(new.lead_agent_payout, 0) + coalesce(new.listing_agent_payout, 0);
  new.referrer_total := coalesce(new.lead_referrer_payout, 0) + coalesce(new.listing_referrer_payout, 0);
  new.axe_total := coalesce(new.lead_axe_payout, 0) + coalesce(new.listing_axe_payout, 0);
  new.split_delta := coalesce(base, 0) - new.agent_total - new.referrer_total - new.axe_total;

  -- Saved from the app: both sides must be sourced and the split must balance, unless a Super Admin explains why.
  if auth.uid() is not null and abs(new.split_delta) > 1 and nullif(trim(new.split_override_reason), '') is null then
    raise exception 'The commission split doesn''t balance (off by %). Set the sourcing model on both sides, or give an override reason.', new.split_delta
      using errcode = 'P0001';
  end if;

  -- USD views of the deal (internal only)
  new.monthly_rent_usd := case when new.deal_currency = 'USD' then new.monthly_rent when rate > 0 then round(new.monthly_rent / rate, 2) end;
  new.total_deal_value_usd := case when new.deal_currency = 'USD' then new.total_deal_value when rate > 0 then round(new.total_deal_value / rate, 2) end;
  new.rent_per_sqft_usd := case when pr.square_feet > 0 then round(new.monthly_rent_usd / pr.square_feet, 4) end;
  new.sale_price_per_sqft_usd := case when new.deal_type = 'sale' and pr.square_feet > 0 then round(new.total_deal_value_usd / pr.square_feet, 4) end;

  -- denormalised for reporting
  new.snap_location_id := pr.location_id; new.snap_development_id := pr.development_id; new.snap_beds := pr.beds;
  new.snap_furnished := pr.furnished; new.snap_property_type := pr.property_type; new.snap_square_feet := pr.square_feet;
  new.snap_property_source_channel_id := pr.source_channel_id;
  new.snap_lead_source_type := ld.lead_source_type; new.snap_lead_source_channel_id := ld.source_channel_id;
  return new;
end $$;

create trigger t40_commission_engine before insert or update on public.closings
  for each row execute function app.commission_engine();

-- Agent payout cycles: the 10th, the 20th and the last day of the month (first one on or after the date).
create or replace function app.next_payout_cycle(d date)
returns date language sql immutable set search_path = ''
as $$
  select case
    when extract(day from d) <= 10 then date_trunc('month', d)::date + 9
    when extract(day from d) <= 20 then date_trunc('month', d)::date + 19
    else (date_trunc('month', d) + interval '1 month - 1 day')::date end
$$;

-- ---------------------------------------------------------------------------
-- 7.2 What a closing does: property Rented/Sold, lead Closed Won, payout schedule.
-- ---------------------------------------------------------------------------
create or replace function app.closing_effects()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  cur public.pipeline_status;
  due date := app.next_payout_cycle(new.closing_date);
begin
  if new.deleted_at is not null then return new; end if;

  -- property
  if new.property_id is not null and (tg_op = 'INSERT' or new.deal_type is distinct from old.deal_type
      or new.lease_end_date is distinct from old.lease_end_date or new.property_id is distinct from old.property_id) then
    update public.properties
       set status = case when new.deal_type = 'sale' then 'sold' else 'rented' end::public.property_status,
           next_available_date = case when new.deal_type = 'sale' then null else coalesce(new.lease_end_date, next_available_date) end,
           website_published = false
     where id = new.property_id;
  end if;

  -- lead (allowed from any stage, but a skipped gate is flagged to the Super Admin)
  if new.lead_id is not null and (tg_op = 'INSERT' or new.lead_id is distinct from old.lead_id) then
    select pipeline_status into cur from public.leads where id = new.lead_id;
    if cur is distinct from 'closed_won' then
      perform set_config('app.closing_engine', 'on', true);
      update public.leads set pipeline_status = 'closed_won' where id = new.lead_id;
      perform set_config('app.closing_engine', '', true);
      if cur is distinct from 'documentation_ready' and new.airtable_id is null then
        insert into public.notifications (recipient_agent_id, kind, title, body, link)
        select a.id, 'gate_skipped', format('Closing #%s skipped the gates', new.closing_no),
               format('The lead was at %s, not Documentation Ready, when the closing was logged.', replace(coalesce(cur::text, 'unknown'), '_', ' ')),
               format('/closings/%s', new.closing_no)
        from public.agents a where a.role = 'super_admin' and a.status = 'active' and a.deleted_at is null;
      end if;
    end if;
  end if;

  -- payout schedule: rebuild unpaid lines; paid lines are never touched
  if new.airtable_id is null then
    delete from public.commission_payouts where closing_id = new.id and paid_on is null;
    insert into public.commission_payouts (closing_id, payee_type, payee_agent_id, payee_referral_partner_id, side, amount, currency, due_date, cycle)
    select new.id, x.ptype::public.payee_type, x.agent, x.referrer, x.side::public.deal_side, x.amount, new.commission_currency,
           case when x.ptype = 'agent' then due end, case when x.ptype = 'agent' then due::text end
    from (values
      ('agent', new.lead_side_agent_id, null::uuid, 'lead', new.lead_agent_payout),
      ('agent', new.listing_side_agent_id, null::uuid, 'listing', new.listing_agent_payout),
      ('referrer', null::uuid, new.lead_side_referral_partner_id, 'lead', new.lead_referrer_payout),
      ('referrer', null::uuid, new.listing_side_referral_partner_id, 'listing', new.listing_referrer_payout)
    ) as x(ptype, agent, referrer, side, amount)
    where x.amount > 0 and new.commission_currency is not null
      and ((x.ptype = 'agent' and x.agent is not null) or (x.ptype = 'referrer' and x.referrer is not null))
      and not exists (select 1 from public.commission_payouts p where p.closing_id = new.id and p.paid_on is not null
                        and p.side = x.side::public.deal_side and p.payee_type = x.ptype::public.payee_type);
  end if;
  return new;
end $$;

create trigger t70_closing_effects after insert or update on public.closings
  for each row execute function app.closing_effects();

-- ---------------------------------------------------------------------------
-- Dashboard numbers an agent may see about themself (targets live in a money table).
-- ---------------------------------------------------------------------------
create or replace function public.my_targets()
returns table (metric text, period text, target_value numeric)
language sql stable security definer set search_path = ''
as $$
  select t.metric, t.period, t.target_value from public.agent_targets t
  where t.agent_id = app.my_agent_id() and t.deleted_at is null
    and t.effective_from <= (now() at time zone 'Asia/Colombo')::date
    and (t.effective_to is null or t.effective_to >= (now() at time zone 'Asia/Colombo')::date)
$$;

-- Closings an agent was on this month: a count only, never values (5.2: no revenue for agents).
create or replace function public.my_closings_count(p_from date, p_to date)
returns bigint language sql stable security definer set search_path = ''
as $$
  select count(*) from public.closings c
  where c.deleted_at is null and c.closing_date between p_from and p_to
    and app.my_agent_id() in (c.lead_side_agent_id, c.listing_side_agent_id)
$$;

grant execute on function public.my_targets() to authenticated;
grant execute on function public.my_closings_count(date, date) to authenticated;
revoke execute on function public.my_targets() from anon;
revoke execute on function public.my_closings_count(date, date) from anon;
revoke execute on function public.move_lead(uuid, public.pipeline_status, uuid, text) from anon;
