-- Axe Realty OS: server-side rules that belong to the data model itself.
-- (Pipeline gates, viewing->lead moves and the commission engine arrive with
--  Phases 2 and 3; their tables already exist.)

-- ---------------------------------------------------------------------------
-- 7.1 Frozen IDs: AX/AXH/AXL/AXV/AXCP + YY + seq, ARLD + YY + seq.
-- The year is the year of creation (Asia/Colombo) and never recomputed.
-- Migration supplies existing codes and seq_no; app.sync_sequences() then
-- moves the sequences past the highest migrated number.
-- ---------------------------------------------------------------------------
create or replace function app.pad_seq(n bigint)
returns text language sql immutable set search_path = ''
as $$ select case when length(n::text) >= 4 then n::text else lpad(n::text, 4, '0') end $$;

create or replace function app.listing_prefix(t public.property_type)
returns text language sql immutable set search_path = ''
as $$
  select case t
    when 'apartment'  then 'AX'
    when 'house'      then 'AXH'
    when 'land'       then 'AXL'
    when 'villa'      then 'AXV'
    when 'commercial' then 'AXCP'
  end
$$;

create or replace function app.property_ids()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.seq_no is null then
      new.seq_no := nextval('public.property_seq');
    end if;
    if new.listing_no is null then
      new.listing_no := app.listing_prefix(new.property_type)
        || to_char(coalesce(new.created_at, now()) at time zone 'Asia/Colombo', 'YY')
        || app.pad_seq(new.seq_no);
    end if;
  else
    if old.listing_no is not null and new.listing_no is distinct from old.listing_no then
      raise exception 'Listing number % is frozen and cannot be changed', old.listing_no using errcode = '42501';
    end if;
    if old.seq_no is not null and new.seq_no is distinct from old.seq_no then
      raise exception 'Property sequence number is frozen' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create or replace function app.lead_ids()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.seq_no is null then
      new.seq_no := nextval('public.lead_seq');
    end if;
    if new.lead_code is null then
      new.lead_code := 'ARLD'
        || to_char(coalesce(new.created_at, now()) at time zone 'Asia/Colombo', 'YY')
        || app.pad_seq(new.seq_no);
    end if;
  else
    if old.lead_code is not null and new.lead_code is distinct from old.lead_code then
      raise exception 'Lead ID % is frozen and cannot be changed', old.lead_code using errcode = '42501';
    end if;
    if old.seq_no is not null and new.seq_no is distinct from old.seq_no then
      raise exception 'Lead sequence number is frozen' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger t30_ids before insert or update on public.properties
  for each row execute function app.property_ids();
create trigger t30_ids before insert or update on public.leads
  for each row execute function app.lead_ids();

-- Run after every migration batch.
create or replace function app.sync_sequences()
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform setval('public.property_seq',   greatest(coalesce((select max(seq_no) from public.properties), 0), 1),
                 (select max(seq_no) from public.properties) is not null);
  perform setval('public.lead_seq',       greatest(coalesce((select max(seq_no) from public.leads), 0), 1),
                 (select max(seq_no) from public.leads) is not null);
  perform setval('public.viewing_no_seq', greatest(coalesce((select max(viewing_no) from public.viewings), 0), 1),
                 (select max(viewing_no) from public.viewings) is not null);
  perform setval('public.closing_no_seq', greatest(coalesce((select max(closing_no) from public.closings), 0), 1),
                 (select max(closing_no) from public.closings) is not null);
end $$;

-- ---------------------------------------------------------------------------
-- Price history: every change to asking rent or sale price is recorded.
-- ---------------------------------------------------------------------------
create or replace function app.record_price_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.asking_rent is distinct from old.asking_rent or new.rent_currency is distinct from old.rent_currency then
    insert into public.price_history (property_id, field, old_amount, old_currency, new_amount, new_currency, changed_by)
    values (new.id, 'asking_rent', old.asking_rent, old.rent_currency, new.asking_rent, new.rent_currency, auth.uid());
  end if;
  if new.asking_sale_price is distinct from old.asking_sale_price or new.sale_currency is distinct from old.sale_currency then
    insert into public.price_history (property_id, field, old_amount, old_currency, new_amount, new_currency, changed_by)
    values (new.id, 'asking_sale_price', old.asking_sale_price, old.sale_currency, new.asking_sale_price, new.sale_currency, auth.uid());
  end if;
  return new;
end $$;

create trigger t60_price_history after update on public.properties
  for each row execute function app.record_price_change();

-- ---------------------------------------------------------------------------
-- Lead stage history: every pipeline move is recorded.
-- ---------------------------------------------------------------------------
create or replace function app.record_stage_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.lead_stage_history (lead_id, from_status, to_status, changed_by, changed_at)
    values (new.id, null, new.pipeline_status, coalesce(auth.uid(), new.created_by), new.created_at);
  elsif new.pipeline_status is distinct from old.pipeline_status then
    insert into public.lead_stage_history (lead_id, from_status, to_status, changed_by)
    values (new.id, old.pipeline_status, new.pipeline_status, auth.uid());
  end if;
  return new;
end $$;

create trigger t60_stage_history after insert or update on public.leads
  for each row execute function app.record_stage_change();

-- ---------------------------------------------------------------------------
-- Commission structure on a property: visible to agents, editable only by
-- Super Admin (5.2).
-- ---------------------------------------------------------------------------
create or replace function app.guard_property_admin_fields()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if auth.uid() is null or app.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.commission_structure is not null then
      raise exception 'Only a Super Admin can set the commission structure' using errcode = '42501';
    end if;
  elsif new.commission_structure is distinct from old.commission_structure then
    raise exception 'Only a Super Admin can change the commission structure' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger t40_admin_fields before insert or update on public.properties
  for each row execute function app.guard_property_admin_fields();

-- ---------------------------------------------------------------------------
-- Forward-only commission schedules: a schedule with closings against it
-- can never be edited or deleted (7.9). Amend by adding a new version.
-- ---------------------------------------------------------------------------
create or replace function app.guard_used_schedule()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare sid uuid;
begin
  sid := coalesce(to_jsonb(old) ->> 'schedule_id', to_jsonb(old) ->> 'id')::uuid;
  if exists (select 1 from public.closings c where c.commission_schedule_id = sid) then
    -- allow closing the window (setting effective_to) but nothing else
    if tg_table_name = 'commission_schedules' and tg_op = 'UPDATE' then
      if new.version = old.version and new.effective_from = old.effective_from
         and new.referrer_rate_pct = old.referrer_rate_pct
         and new.deleted_at is not distinct from old.deleted_at then
        return new;
      end if;
    end if;
    raise exception 'This commission schedule has closings against it and cannot be changed. Add a new version with a future effective date.'
      using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;

create trigger t50_guard_used before update or delete on public.commission_schedules
  for each row execute function app.guard_used_schedule();
create trigger t50_guard_used before update or delete on public.commission_schedule_rates
  for each row execute function app.guard_used_schedule();

-- ---------------------------------------------------------------------------
-- Central USD/LKR rate.
-- app.usd_lkr_on(d): an active manual override wins; otherwise the latest
-- automatic rate on or before d. Every conversion in the platform uses this.
-- ---------------------------------------------------------------------------
create or replace function app.usd_lkr_on(d date default (now() at time zone 'Asia/Colombo')::date)
returns numeric
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select f.usd_lkr from public.fx_rates f
      where f.source = 'manual' and f.deleted_at is null
        and f.rate_date <= d and (f.pinned_until is null or f.pinned_until >= d)
      order by f.rate_date desc, f.created_at desc limit 1),
    (select f.usd_lkr from public.fx_rates f
      where f.source = 'auto' and f.deleted_at is null and f.rate_date <= d
      order by f.rate_date desc limit 1)
  )
$$;

-- Converts an amount to LKR or USD with the central rate (website price filters,
-- revenue target, reports).
create or replace function app.to_lkr(amount numeric, cur public.currency, d date default null)
returns numeric language sql stable set search_path = ''
as $$
  select case when amount is null then null
              when cur = 'LKR' then amount
              else round(amount * app.usd_lkr_on(coalesce(d, (now() at time zone 'Asia/Colombo')::date)), 2) end
$$;

create or replace function app.to_usd(amount numeric, cur public.currency, d date default null)
returns numeric language sql stable set search_path = ''
as $$
  select case when amount is null then null
              when cur = 'USD' then amount
              else round(amount / nullif(app.usd_lkr_on(coalesce(d, (now() at time zone 'Asia/Colombo')::date)), 0), 2) end
$$;

-- Receipts and closings take the central rate for their date unless one is typed in.
create or replace function app.fill_fx_rate()
returns trigger language plpgsql set search_path = ''
as $$
declare d date;
begin
  if new.usd_lkr_rate is not null then
    return new;
  end if;
  d := case tg_table_name when 'commission_receipts' then (to_jsonb(new) ->> 'received_on')::date
                          else (to_jsonb(new) ->> 'closing_date')::date end;
  new.usd_lkr_rate := app.usd_lkr_on(d);
  if new.usd_lkr_rate is null and tg_table_name = 'commission_receipts' then
    raise exception 'No USD/LKR rate is stored for %. Enter the rate on this line or add one in Settings.', d
      using errcode = '23502';
  end if;
  return new;
end $$;

create trigger t35_fx_rate before insert or update on public.commission_receipts
  for each row execute function app.fill_fx_rate();
create trigger t35_fx_rate before insert or update on public.closings
  for each row execute function app.fill_fx_rate();

-- Only one live manual override at a time: adding a new one ends the previous.
create or replace function app.close_previous_override()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.source = 'manual' and new.deleted_at is null then
    update public.fx_rates
       set pinned_until = new.rate_date - 1
     where source = 'manual' and deleted_at is null and id <> new.id
       and rate_date < new.rate_date
       and (pinned_until is null or pinned_until >= new.rate_date);
  end if;
  return new;
end $$;

create trigger t60_close_override after insert on public.fx_rates
  for each row execute function app.close_previous_override();
