-- Axe Realty OS: the rest of the CRM before the team leaves Airtable.
--   1. Agent revenue targets (Super Admin only; agents never see revenue, 5.2)
--   2. Owner mandate lifecycle (8.3)
--   3. Offers (8.6): the Gate 1 offer generator's records; a sent offer ticks Gate 1

-- ---------------------------------------------------------------------------
-- 1. Targets: add revenue per agent, keep it out of the agent's own view.
-- ---------------------------------------------------------------------------
alter table public.agent_targets drop constraint if exists agent_targets_metric_check;
alter table public.agent_targets add constraint agent_targets_metric_check
  check (metric in ('viewings', 'properties_sourced', 'closings', 'revenue_lkr'));

drop policy if exists p_select_own on public.agent_targets;
create policy p_select_own on public.agent_targets for select to authenticated
  using (agent_id = app.my_agent_id() and deleted_at is null and metric <> 'revenue_lkr');

create or replace function public.my_targets()
returns table (metric text, period text, target_value numeric)
language sql stable security definer set search_path = ''
as $$
  select t.metric, t.period, t.target_value from public.agent_targets t
  where t.agent_id = app.my_agent_id() and t.deleted_at is null and t.metric <> 'revenue_lkr'
    and t.effective_from <= (now() at time zone 'Asia/Colombo')::date
    and (t.effective_to is null or t.effective_to >= (now() at time zone 'Asia/Colombo')::date)
$$;

create index if not exists agent_targets_agent_idx on public.agent_targets (agent_id, metric, effective_from);

-- ---------------------------------------------------------------------------
-- 2. Owner mandate lifecycle.
-- ---------------------------------------------------------------------------
create type public.mandate_status as enum ('prospect', 'assessment_booked', 'mandate_won', 'lost');
alter table public.owners
  add column mandate_status public.mandate_status,
  add column mandate_updated_at timestamptz;

-- Owners who already have a listing with us have, by definition, given us the mandate.
update public.owners o set mandate_status = 'mandate_won'
where o.mandate_status is null
  and exists (select 1 from public.properties p where p.owner_id = o.id and p.deleted_at is null);

create or replace function app.stamp_mandate()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.mandate_status is distinct from old.mandate_status then
    new.mandate_updated_at := now();
  end if;
  return new;
end $$;
create trigger t30_stamp_mandate before insert or update of mandate_status on public.owners
  for each row execute function app.stamp_mandate();

-- ---------------------------------------------------------------------------
-- 3. Offers. Ref = lead code; revisions append -O2, -O3 (8.6).
-- ---------------------------------------------------------------------------
create type public.offer_status as enum ('draft', 'sent', 'countered', 'accepted', 'rejected', 'expired');

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id),
  property_id uuid references public.properties (id),
  deal_type public.deal_type not null,
  version smallint not null default 1 check (version >= 1),
  ref text not null unique,
  issued_on date not null default ((now() at time zone 'Asia/Colombo')::date),
  valid_until date not null,
  terms jsonb not null default '{}'::jsonb,
  status public.offer_status not null default 'draft',
  sent_at timestamptz,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz,
  unique (lead_id, version),
  check (valid_until >= issued_on)
);
create index offers_lead_idx on public.offers (lead_id);
comment on table public.offers is 'Offers on the Axe Realty template (Gate 1). Terms are internal: never published.';

revoke all on public.offers from anon;
grant select, insert, update, delete on public.offers to authenticated;
grant all on public.offers to service_role;
alter table public.offers enable row level security;
create policy p_select on public.offers for select to authenticated
  using (app.can('offers', 'select') and (deleted_at is null or app.can('offers', 'delete')));
create policy p_insert on public.offers for insert to authenticated with check (app.can('offers', 'insert'));
create policy p_update on public.offers for update to authenticated
  using (app.can('offers', 'update')) with check (app.can('offers', 'update'));
create policy p_delete on public.offers for delete to authenticated using (app.can('offers', 'delete'));

insert into public.role_permissions values
  ('super_admin', 'offers', true, true, true, true),
  ('sales_manager', 'offers', true, true, true, false),
  ('agent', 'offers', true, true, true, false)
on conflict (role, resource) do nothing;

create trigger t10_stamp before insert or update on public.offers for each row execute function app.stamp();
create trigger t20_soft_delete before insert or update on public.offers for each row execute function app.guard_soft_delete();
create trigger z90_audit after insert or update or delete on public.offers for each row execute function app.audit();

-- Ref and version are set by the database so two agents can't issue the same number.
create or replace function app.offer_ref()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare code text;
begin
  select l.lead_code into code from public.leads l where l.id = new.lead_id;
  if code is null then raise exception 'Lead not found' using errcode = '23503'; end if;
  perform pg_advisory_xact_lock(hashtext('offer:' || new.lead_id::text));
  select coalesce(max(o.version), 0) + 1 into new.version from public.offers o where o.lead_id = new.lead_id;
  new.ref := case when new.version = 1 then code else code || '-O' || new.version end;
  return new;
end $$;
create trigger t05_offer_ref before insert on public.offers for each row execute function app.offer_ref();

-- Marking an offer sent stamps sent_at and ticks Gate 1 (8.6).
create or replace function app.offer_sent()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.status <> 'draft' and new.sent_at is null then new.sent_at := now(); end if;
  return new;
end $$;
create trigger t30_offer_sent before insert or update on public.offers for each row execute function app.offer_sent();

create or replace function app.offer_ticks_gate()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.sent_at is not null and new.deleted_at is null and (tg_op = 'INSERT' or old.sent_at is null) then
    insert into public.lead_gate_ticks (lead_id, gate_item_key) values (new.lead_id, 'gate1_offer_sent')
    on conflict do nothing;
  end if;
  return null;
end $$;
create trigger t70_offer_ticks_gate after insert or update on public.offers
  for each row execute function app.offer_ticks_gate();
