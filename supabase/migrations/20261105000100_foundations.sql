-- Axe Realty OS: foundations
-- Enums, the private `app` schema, permission helpers and generic triggers.
-- Every business table is created in later migrations; this file only defines building blocks.

create schema if not exists app;
comment on schema app is 'Internal helpers. Not exposed through the Supabase API.';

-- ---------------------------------------------------------------------------
-- Enumerations (fixed lists). Editable lists are lookup tables (see 0200).
-- Labels are snake_case; the UI maps them to display text.
-- ---------------------------------------------------------------------------
create type public.agent_role as enum ('super_admin', 'sales_manager', 'agent', 'data_entry');
create type public.agent_status as enum ('active', 'inactive');
create type public.weekday as enum ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

create type public.property_type as enum ('apartment', 'house', 'land', 'villa', 'commercial');
create type public.property_status as enum ('available', 'reserved', 'rented', 'sold', 'withdrawn');
create type public.listing_type as enum ('rent_long_term', 'rent_short_term', 'sale');
create type public.property_condition as enum ('brand_new', 'off_plan', 'under_construction', 'used');
create type public.furnishing as enum ('fully', 'semi', 'unfurnished', 'unknown');
create type public.currency as enum ('LKR', 'USD');
create type public.source_type as enum ('direct', 'via_agent');
create type public.sourcing_model as enum ('company_direct', 'company_via_referrer', 'agent_self_sourced', 'agent_via_referrer');

create type public.owner_type as enum ('individual', 'corporate', 'developer', 'bank', 'unknown_via_agent');
create type public.contact_protocol as enum ('direct_call_ok', 'introduce_via_whatsapp_first', 'route_through_adhith');
create type public.investor_type as enum ('first_time_buyer', 'casual_investor', 'serial_investor', 'end_user', 'developer', 'not_applicable');
create type public.looking_for as enum ('rent', 'buy', 'either');

create type public.lead_profile as enum ('expat', 'diplomatic', 'corporate', 'local');
create type public.purchase_timeline as enum ('immediate', 'months_1_3', 'months_3_6', 'months_6_plus');
create type public.financing as enum ('cash', 'bank_loan', 'part_cash_part_loan');
create type public.pipeline_status as enum (
  'new', 'contacted', 'viewing_scheduled', 'viewing_completed', 'ongoing_negotiations',
  'deposit_paid', 'documentation_ready', 'closed_won', 'lost', 'dormant'
);
create type public.urgency as enum ('low', 'medium', 'high', 'immediate');

create type public.viewing_outcome as enum ('pending', 'interested', 'not_interested', 'wants_second_viewing', 'made_offer');
create type public.viewing_model as enum (
  'our_lead_our_property', 'our_lead_cobroke_property', 'cobroke_lead_our_property',
  'cobroke_lead_cobroke_property', 'sourcing_visit'
);

create type public.deal_type as enum ('rental', 'short_let', 'sale');
create type public.payment_method as enum ('bank_transfer', 'cash', 'cheque', 'card');
create type public.deal_side as enum ('lead', 'listing');
create type public.agent_tenure as enum ('probation', 'confirmed');
create type public.payee_type as enum ('agent', 'referrer');

create type public.development_status as enum ('completed', 'under_construction', 'off_plan', 'pre_launch');
create type public.market_tier as enum ('prime_core', 'outside_core');
create type public.referral_attribution as enum ('company_referrer', 'agent_personal_referrer');

create type public.marketing_audience as enum ('owner', 'buyer_investor', 'tenant');
create type public.marketing_status as enum ('new', 'nurturing', 'engaged', 'promoted', 'unsubscribed', 'disqualified');

create type public.water_source as enum ('mains', 'well', 'tube_well', 'both');
create type public.land_shape as enum ('square', 'rectangular', 'irregular');
create type public.land_category as enum ('residential', 'commercial', 'mixed', 'agricultural', 'beachfront');
create type public.title_type as enum ('freehold', 'leasehold', 'crown_grant');
create type public.pool_size as enum ('small', 'medium', 'large');
create type public.commercial_sub_category as enum ('office', 'retail', 'warehouse');
create type public.building_grade as enum ('a', 'b', 'c');
create type public.air_conditioning as enum ('central', 'split', 'none');
create type public.floor_sharing as enum ('shared_floor', 'dedicated_floor');
create type public.storefront_type as enum ('glass', 'solid', 'mixed');
create type public.traffic_level as enum ('high', 'medium', 'low');

create type public.photo_source as enum ('upload', 'drive_import', 'airtable_import');
create type public.activity_type as enum ('call', 'whatsapp', 'email', 'meeting', 'note');
create type public.task_status as enum ('open', 'done', 'cancelled');
create type public.audit_action as enum ('create', 'update', 'delete', 'restore', 'hard_delete');
create type public.change_source as enum ('app', 'website', 'api', 'job', 'migration');
create type public.fx_source as enum ('auto', 'manual');

-- ---------------------------------------------------------------------------
-- Role-based permissions, stored as data so a new role (e.g. Sales Manager)
-- is a configuration change, not a code change. Policies call app.can().
-- ---------------------------------------------------------------------------
create table public.role_permissions (
  role        public.agent_role not null,
  resource    text not null,           -- table name
  can_select  boolean not null default false,
  can_insert  boolean not null default false,
  can_update  boolean not null default false,
  can_delete  boolean not null default false,  -- soft delete, restore and hard delete
  primary key (role, resource)
);
comment on table public.role_permissions is 'Which role may do what on which table. Read by app.can() inside every RLS policy.';

-- ---------------------------------------------------------------------------
-- Identity helpers. auth.uid() / auth.jwt() are provided by Supabase Auth.
-- The agents table is created in 0200; these functions are created now with
-- late binding (plpgsql resolves the table at call time).
-- ---------------------------------------------------------------------------
create or replace function app.my_agent_id()
returns uuid
language plpgsql stable security definer
set search_path = ''
as $$
declare v uuid;
begin
  select a.id into v
  from public.agents a
  where a.user_id = auth.uid() and a.status = 'active' and a.deleted_at is null;
  return v;
end $$;

create or replace function app.my_role()
returns public.agent_role
language plpgsql stable security definer
set search_path = ''
as $$
declare v public.agent_role;
begin
  select a.role into v
  from public.agents a
  where a.user_id = auth.uid() and a.status = 'active' and a.deleted_at is null;
  return v;
end $$;

-- Super Admin privileges only count on a session that has passed 2FA (aal2).
create or replace function app.mfa_ok()
returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
$$;

create or replace function app.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select app.my_role() = 'super_admin' and app.mfa_ok()
$$;

create or replace function app.can(p_resource text, p_action text)
returns boolean
language plpgsql stable security definer
set search_path = ''
as $$
declare
  r public.agent_role := app.my_role();
  ok boolean;
begin
  if r is null then
    return false;
  end if;
  if r = 'super_admin' and not app.mfa_ok() then
    return false;   -- a Super Admin without 2FA gets nothing until they verify
  end if;
  select case p_action
           when 'select' then rp.can_select
           when 'insert' then rp.can_insert
           when 'update' then rp.can_update
           when 'delete' then rp.can_delete
           else false
         end
    into ok
  from public.role_permissions rp
  where rp.role = r and rp.resource = p_resource;
  return coalesce(ok, false);
end $$;

-- ---------------------------------------------------------------------------
-- Generic triggers
-- ---------------------------------------------------------------------------

-- Stamps created_by / updated_at / updated_by. created_at and created_by are
-- never changed after insert (migration may supply them on insert).
create or replace function app.stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.created_by := coalesce(new.created_by, auth.uid());
    new.updated_at := new.created_at;
    new.updated_by := new.created_by;
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;
  return new;
end $$;

-- Only roles with delete permission may set or clear deleted_at.
create or replace function app.guard_soft_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;   -- server jobs and migrations (service role / postgres)
  end if;
  if tg_op = 'INSERT' and new.deleted_at is not null and not app.can(tg_table_name, 'delete') then
    raise exception 'Only a Super Admin can create a deleted record' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.deleted_at is distinct from old.deleted_at and not app.can(tg_table_name, 'delete') then
    raise exception 'Only a Super Admin can delete or restore records' using errcode = '42501';
  end if;
  return new;
end $$;

-- Audit log writer. Attached to every table in 0500.
create or replace function app.audit()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_action public.audit_action;
  v_before jsonb;
  v_after  jsonb;
  v_id     text;
  v_source public.change_source;
begin
  v_source := coalesce(nullif(current_setting('app.change_source', true), '')::public.change_source,
                       case when auth.uid() is null then 'job' else 'app' end::public.change_source);
  if tg_op = 'INSERT' then
    v_action := 'create'; v_after := to_jsonb(new);
  elsif tg_op = 'DELETE' then
    v_action := 'hard_delete'; v_before := to_jsonb(old);
  else
    v_before := to_jsonb(old); v_after := to_jsonb(new);
    if v_before = v_after then
      return new;  -- no-op update
    end if;
    v_action := case
      when (v_after ? 'deleted_at') and (v_before ->> 'deleted_at') is null and (v_after ->> 'deleted_at') is not null then 'delete'
      when (v_after ? 'deleted_at') and (v_before ->> 'deleted_at') is not null and (v_after ->> 'deleted_at') is null then 'restore'
      else 'update'
    end::public.audit_action;
  end if;
  v_id := coalesce(v_after ->> 'id', v_before ->> 'id',
                   v_after ->> 'key', v_before ->> 'key',
                   v_after ->> 'code', v_before ->> 'code',
                   coalesce(v_after, v_before)::text);   -- join tables: the key columns
  insert into public.audit_log (table_name, record_id, action, changed_by, before, after, source)
  values (tg_table_name, v_id, v_action, auth.uid(), v_before, v_after, v_source);
  return coalesce(new, old);
end $$;
