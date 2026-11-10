-- Imported history is not a live event. Records brought over from Airtable (airtable_id set) keep the
-- state they had there: an old closing must not mark today's property Rented/unpublished, and an old
-- viewing must not move a lead that Airtable already placed. Live records behave as before.

create or replace function app.closing_effects()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  cur public.pipeline_status;
  due date := app.next_payout_cycle(new.closing_date);
begin
  if new.deleted_at is not null or new.airtable_id is not null then return new; end if;

  if new.property_id is not null and (tg_op = 'INSERT' or new.deal_type is distinct from old.deal_type
      or new.lease_end_date is distinct from old.lease_end_date or new.property_id is distinct from old.property_id) then
    update public.properties
       set status = case when new.deal_type = 'sale' then 'sold' else 'rented' end::public.property_status,
           next_available_date = case when new.deal_type = 'sale' then null else coalesce(new.lease_end_date, next_available_date) end,
           website_published = false
     where id = new.property_id;
  end if;

  if new.lead_id is not null and (tg_op = 'INSERT' or new.lead_id is distinct from old.lead_id) then
    select pipeline_status into cur from public.leads where id = new.lead_id;
    if cur is distinct from 'closed_won' then
      perform set_config('app.closing_engine', 'on', true);
      update public.leads set pipeline_status = 'closed_won' where id = new.lead_id;
      perform set_config('app.closing_engine', '', true);
      if cur is distinct from 'documentation_ready' then
        insert into public.notifications (recipient_agent_id, kind, title, body, link)
        select a.id, 'gate_skipped', format('Closing #%s skipped the gates', new.closing_no),
               format('The lead was at %s, not Documentation Ready, when the closing was logged.', replace(coalesce(cur::text, 'unknown'), '_', ' ')),
               format('/closings/%s', new.closing_no)
        from public.agents a where a.role = 'super_admin' and a.status = 'active' and a.deleted_at is null;
      end if;
    end if;
  end if;

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
  return new;
end $$;

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
  if tg_op = 'INSERT' and new.airtable_id is not null then return new; end if;  -- imported history
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

-- Imported leads keep whatever stage Airtable had, gates or not (the history happened there).
create or replace function app.guard_pipeline()
returns trigger language plpgsql set search_path = ''
as $$
declare
  missing text[];
  override text := nullif(current_setting('app.gate_override_reason', true), '');
  by_closing boolean := coalesce(current_setting('app.closing_engine', true), '') = 'on';
begin
  if new.pipeline_status is not distinct from old.pipeline_status then return new; end if;
  if auth.uid() is null and new.airtable_id is not null then return new; end if;  -- Airtable re-sync
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
