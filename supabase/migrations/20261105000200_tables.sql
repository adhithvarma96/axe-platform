-- Axe Realty OS: tables (SPEC section 6)
-- Every main table carries: id, created_at, created_by, updated_at, updated_by,
-- deleted_at (soft delete) and airtable_id (migration upsert key).
-- Join tables (many-to-many) carry only their keys plus created_at.

-- ===========================================================================
-- Lookup lists (editable by Super Admin without a code change)
-- ===========================================================================
create table public.source_channels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  applies_to_leads boolean not null default true,
  applies_to_properties boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);

create table public.owner_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);

create table public.referrer_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);

create table public.property_features (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,            -- Penthouse, Duplex, Pet Friendly, Sea View ...
  slug text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);

create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);

create table public.provinces (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);

create table public.lost_reasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);

create table public.countries (
  code char(2) primary key,             -- ISO 3166-1 alpha-2
  name text not null unique,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);

create table public.marketing_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,            -- Report – Landing Page, Newsletter Signup, Ad Lead Form
  sort_order int not null default 0,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);

-- ===========================================================================
-- 6.1 agents (+ HR details split out so RLS can hide them from agents)
-- ===========================================================================
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  full_name text not null,
  public_name text,                      -- shown on the website listing card
  public_whatsapp text,
  role public.agent_role not null default 'agent',
  status public.agent_status not null default 'active',
  work_email text,
  weekly_day_off public.weekday,
  airtable_id text unique,
  airtable_collaborator_email text,      -- maps Airtable "created by" to this agent during migration
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);
create unique index agents_work_email_key on public.agents (lower(work_email)) where work_email is not null;

create table public.agent_hr (
  agent_id uuid primary key references public.agents (id) on delete cascade,
  date_joined date,
  probation_end_date date,               -- closings on/before this date use probation rates
  commission_exempt boolean not null default false,   -- owner rule (7.9)
  personal_email text,
  personal_phone text,
  personal_address text,
  document_links text,
  notes text,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);
comment on table public.agent_hr is 'Employment terms and HR details (join date, probation, commission-exempt, personal contact). Super Admin only.';

-- ===========================================================================
-- 6.5 locations, 6.6 developments + towers
-- ===========================================================================
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  province_id uuid references public.provinces (id),
  postal_code text,
  notes text,
  slug text unique,                      -- must match the live website URL (11.2)
  market_tier public.market_tier,
  seo_title text, seo_meta_description text, seo_intro text, seo_body text, seo_faq jsonb,
  airtable_id text unique,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);

create table public.developments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location_id uuid references public.locations (id),
  developer_builder text,
  year_completed int,
  total_units int,
  towers_blocks text,
  development_status public.development_status,
  notes text,
  slug text unique,
  seo_title text, seo_meta_description text, seo_intro text, seo_body text, seo_faq jsonb,
  hero_image_path text,
  airtable_id text unique,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);
create unique index developments_name_key on public.developments (lower(name)) where deleted_at is null;

create table public.development_towers (
  id uuid primary key default gen_random_uuid(),
  development_id uuid not null references public.developments (id),
  name text not null,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz,
  unique (development_id, name)
);

create table public.development_facilities (
  development_id uuid not null references public.developments (id) on delete cascade,
  facility_id uuid not null references public.facilities (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (development_id, facility_id)
);

-- ===========================================================================
-- 6.3 external agents, 6.4 referral partners
-- ===========================================================================
create table public.external_agents (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  company text,
  phone text,
  whatsapp text,
  email text,
  areas_covered_text text,               -- legacy free text from Airtable
  reliability smallint check (reliability between 1 and 5),
  notes text,
  airtable_id text unique,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);

create table public.external_agent_locations (
  external_agent_id uuid not null references public.external_agents (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (external_agent_id, location_id)
);

create table public.referral_partners (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  company_organization text,
  referrer_category_id uuid references public.referrer_categories (id),
  attribution public.referral_attribution,
  attributed_to_agent_id uuid references public.agents (id),
  notes text,
  registered_at timestamptz,             -- first-to-register wins
  address text,
  agreement_signed_on date,
  agreement_valid_until date,
  referral_rate_pct numeric(5,2) not null default 15 check (referral_rate_pct between 0 and 15),
  airtable_id text unique,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);

create table public.referral_partner_private (
  referral_partner_id uuid primary key references public.referral_partners (id) on delete cascade,
  nic_number text,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);
comment on table public.referral_partner_private is 'NIC number required by the referral agreement. Super Admin only.';

-- ===========================================================================
-- 6.2 owners
-- ===========================================================================
create table public.owners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_type public.owner_type,
  primary_phone text,
  whatsapp text,
  email text,
  address text,
  notes text,
  contact_protocol public.contact_protocol,
  contact_notes text,
  owner_source_id uuid references public.owner_sources (id),
  sourced_by_agent_id uuid references public.agents (id),
  -- owner-as-buyer profile
  open_to_buying boolean not null default false,
  investor_type public.investor_type,
  buying_looking_for public.looking_for,
  buying_property_types public.property_type[] not null default '{}',
  buying_budget_min numeric(14,2),
  buying_budget_max numeric(14,2),
  buying_budget_currency public.currency,
  buying_notes text,
  ai_buyer_summary text,
  airtable_id text unique,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);

create table public.owner_source_external_agents (
  owner_id uuid not null references public.owners (id) on delete cascade,
  external_agent_id uuid not null references public.external_agents (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, external_agent_id)
);

create table public.owner_buying_locations (
  owner_id uuid not null references public.owners (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, location_id)
);

-- ===========================================================================
-- 6.7 properties
-- ===========================================================================
create sequence public.property_seq as bigint start 1;

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  -- identity & classification
  listing_no text unique,                -- frozen at creation (7.1)
  seq_no bigint unique,
  property_type public.property_type not null,
  status public.property_status not null default 'available',
  listing_types public.listing_type[] not null default '{}',
  condition public.property_condition,
  expected_completion_date date,
  listing_date date,
  location_id uuid references public.locations (id),
  development_id uuid references public.developments (id),
  tower_id uuid references public.development_towers (id),
  tower_name_legacy text,                -- Airtable's global tower value, kept until mapped
  unit_number text,                      -- internal only
  floor text,                            -- internal only
  building_name text,
  is_bulk_import boolean not null default false,  -- excluded from "properties sourced"
  -- size & layout
  square_feet numeric(10,2),
  beds smallint,
  baths smallint,
  parking smallint,
  furnished public.furnishing,
  maids_room boolean,
  maids_bath boolean,
  -- pricing & availability
  asking_rent numeric(14,2),
  rent_currency public.currency,
  asking_sale_price numeric(16,2),
  sale_currency public.currency,
  price_on_request boolean not null default false,
  available_from date,
  next_available_date date,
  last_made_available date,
  last_verified date,
  -- sourcing & ownership
  owner_id uuid references public.owners (id),
  source_channel_id uuid references public.source_channels (id),
  listing_source_type public.source_type,
  listing_agent_id uuid references public.agents (id),
  sourcing_model public.sourcing_model,
  referral_partner_id uuid references public.referral_partners (id),
  commission_structure text,             -- Super Admin edit only
  -- notes & links
  public_notes text,                     -- the ONLY free text that may reach the website
  internal_notes text,
  map_pin text,                          -- internal only
  photos_link text,
  customer_photo_link text,
  -- distribution checklist
  website_published boolean not null default false,
  website_published_at timestamptz,
  lanka_property_web_posted boolean not null default false,
  lanka_property_web_posted_at timestamptz,
  ikman_posted boolean not null default false,
  ikman_posted_at timestamptz,
  realtor_wa_groups_posted boolean not null default false,
  realtor_wa_groups_posted_at timestamptz,
  google_indexed boolean not null default false,
  google_indexed_at timestamptz,
  web_slug text unique,                  -- e.g. ax25063-bullers-lane-residencies (kept for live URLs)
  -- house / villa
  land_extent_perches numeric(10,2),
  built_up_area_sqft numeric(10,2),
  number_of_floors smallint,
  garden boolean,
  garden_size_perches numeric(10,2),
  servant_quarters boolean,
  boundary_wall boolean,
  water_source public.water_source,
  roof_type text,
  generator boolean,
  -- land
  frontage_ft numeric(10,2),
  depth_ft numeric(10,2),
  land_shape public.land_shape,
  land_category public.land_category,
  beachfront boolean,
  beach_frontage_ft numeric(10,2),
  distance_to_sea_ft numeric(10,2),
  title_type public.title_type,
  road_access_width_ft numeric(10,2),
  electricity_available boolean,
  water_mains_available boolean,
  telecom_available boolean,
  subdivided boolean,
  -- villa / short-let
  pool boolean,
  pool_size public.pool_size,
  sea_view boolean,
  beach_access boolean,
  beach_distance_m numeric(10,2),
  outdoor_dining boolean,
  daily_rate numeric(14,2),
  daily_rate_currency public.currency,
  weekly_rate numeric(14,2),
  monthly_rate_short_let numeric(14,2),
  minimum_stay_nights smallint,
  max_occupancy smallint,
  cleaning_fee numeric(14,2),
  -- commercial
  commercial_sub_category public.commercial_sub_category,
  total_floor_area_sqft numeric(12,2),
  year_built int,
  building_grade public.building_grade,
  service_charge_lkr numeric(14,2),
  floors_available text,
  workstation_capacity int,
  conference_rooms smallint,
  air_conditioning public.air_conditioning,
  server_it_room boolean,
  shared_or_dedicated public.floor_sharing,
  storefront_type public.storefront_type,
  foot_traffic public.traffic_level,
  signage_rights boolean,
  ceiling_height_ft numeric(6,2),
  loading_docks smallint,
  truck_container_access_40ft boolean,
  cold_storage boolean,
  three_phase_power boolean,
  bulk_lease_available boolean,
  bulk_discount_pct numeric(5,2),
  bulk_minimum_units int,
  -- generated
  ai_summary text,
  airtable_id text unique,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz,
  constraint properties_referrer_required check (
    sourcing_model is null
    or sourcing_model not in ('company_via_referrer', 'agent_via_referrer')
    or referral_partner_id is not null
  )
);
create index properties_status_idx on public.properties (status) where deleted_at is null;
create index properties_development_idx on public.properties (development_id);
create index properties_location_idx on public.properties (location_id);
create index properties_owner_idx on public.properties (owner_id);

create table public.property_feature_links (
  property_id uuid not null references public.properties (id) on delete cascade,
  feature_id uuid not null references public.property_features (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (property_id, feature_id)
);

create table public.property_source_external_agents (
  property_id uuid not null references public.properties (id) on delete cascade,
  external_agent_id uuid not null references public.external_agents (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (property_id, external_agent_id)
);

create table public.property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id),
  storage_path text not null,
  original_filename text,
  source public.photo_source not null default 'upload',
  source_ref text,                       -- Drive file id / Airtable attachment id
  content_hash text,                     -- sha256 of original bytes, catches re-uploads
  sort_order int not null default 0,
  is_cover boolean not null default false,
  width int, height int, bytes bigint,
  variants jsonb,
  caption text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz,
  unique (property_id, source, source_ref)
);
create unique index property_photos_hash_key on public.property_photos (property_id, content_hash)
  where content_hash is not null and deleted_at is null;
create unique index property_photos_one_cover on public.property_photos (property_id)
  where is_cover and deleted_at is null;

create table public.price_history (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  field text not null check (field in ('asking_rent', 'asking_sale_price')),
  old_amount numeric(16,2),
  old_currency public.currency,
  new_amount numeric(16,2),
  new_currency public.currency,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

-- ===========================================================================
-- 6.8 leads
-- ===========================================================================
create sequence public.lead_seq as bigint start 1;

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  lead_code text unique,                 -- frozen at creation, e.g. ARLD260045
  seq_no bigint unique,
  name text not null,
  profile public.lead_profile,
  nationality_code char(2) references public.countries (code),
  phone text,
  email text,
  company text,
  lead_source_type public.source_type,
  source_channel_id uuid references public.source_channels (id),
  referring_external_agent_id uuid references public.external_agents (id),
  looking_for public.looking_for,
  property_types_wanted public.property_type[] not null default '{}',
  bedrooms smallint,
  occupants smallint,
  budget_min numeric(16,2),
  budget_max numeric(16,2),
  budget_currency public.currency,
  move_in_date date,
  purchase_timeline public.purchase_timeline,
  financing public.financing,
  pipeline_status public.pipeline_status not null default 'new',
  urgency public.urgency,
  assigned_agent_id uuid references public.agents (id),
  last_contacted date,
  detailed_requirements text,
  internal_notes text,
  linked_owner_id uuid references public.owners (id),
  sourcing_model public.sourcing_model,
  referral_partner_id uuid references public.referral_partners (id),
  lost_reason_id uuid references public.lost_reasons (id),
  ai_lead_summary text,
  utm_source text, utm_medium text, utm_campaign text, fbclid text,
  airtable_id text unique,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz,
  constraint leads_referrer_required check (
    sourcing_model is null
    or sourcing_model not in ('company_via_referrer', 'agent_via_referrer')
    or referral_partner_id is not null
  )
);
create index leads_status_idx on public.leads (pipeline_status) where deleted_at is null;
create index leads_agent_idx on public.leads (assigned_agent_id);

create table public.lead_preferred_locations (
  lead_id uuid not null references public.leads (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lead_id, location_id)
);

create table public.lead_preferred_developments (
  lead_id uuid not null references public.leads (id) on delete cascade,
  development_id uuid not null references public.developments (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lead_id, development_id)
);

create table public.lead_features_wanted (
  lead_id uuid not null references public.leads (id) on delete cascade,
  feature_id uuid not null references public.property_features (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lead_id, feature_id)
);

create table public.lead_stage_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  from_status public.pipeline_status,
  to_status public.pipeline_status not null,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  override_reason text                   -- set when a Super Admin overrode a gate
);
create index lead_stage_history_lead_idx on public.lead_stage_history (lead_id, changed_at);

-- Pipeline gates (7.8): definitions are data, ticks are per lead.
create table public.gate_items (
  key text primary key,                  -- e.g. gate1_offer_sent
  gate smallint not null check (gate between 1 and 9),
  required_for public.pipeline_status not null,
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);

create table public.lead_gate_ticks (
  lead_id uuid not null references public.leads (id) on delete cascade,
  gate_item_key text not null references public.gate_items (key),
  ticked_by uuid,
  ticked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (lead_id, gate_item_key)
);

create table public.gate_breach_attempts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  attempted_status public.pipeline_status not null,
  missing_items text[] not null,
  attempted_by uuid,
  attempted_at timestamptz not null default now()
);

-- ===========================================================================
-- 6.9 viewings
-- ===========================================================================
create sequence public.viewing_no_seq as bigint start 1;

create table public.viewings (
  id uuid primary key default gen_random_uuid(),
  viewing_no bigint unique not null default nextval('public.viewing_no_seq'),
  date date not null,
  time time,
  time_text_legacy text,                 -- Airtable stored time as free text
  lead_id uuid references public.leads (id),
  property_id uuid references public.properties (id),
  outcome public.viewing_outcome not null default 'pending',
  conducted_by_agent_id uuid references public.agents (id),
  viewing_model public.viewing_model,
  co_broke_external_agent_id uuid references public.external_agents (id),
  landlord_present boolean,
  feedback_notes text,
  last_follow_up date,
  airtable_id text unique,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);
alter sequence public.viewing_no_seq owned by public.viewings.viewing_no;
create index viewings_lead_idx on public.viewings (lead_id);
create index viewings_property_idx on public.viewings (property_id);
create index viewings_date_idx on public.viewings (date);

-- ===========================================================================
-- 7.9 commission schedules (versioned, forward-only)
-- ===========================================================================
create table public.commission_schedules (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,          -- '1.0', 'legacy'
  name text not null,
  effective_from date not null,
  effective_to date,
  referrer_rate_pct numeric(5,2) not null default 15,
  notes text,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz,
  check (effective_to is null or effective_to >= effective_from)
);

create table public.commission_schedule_rates (
  schedule_id uuid not null references public.commission_schedules (id) on delete cascade,
  sourcing_model public.sourcing_model not null,
  tenure public.agent_tenure not null,
  agent_rate numeric(5,2) not null check (agent_rate >= 0),
  referrer_rate numeric(5,2) not null check (referrer_rate >= 0),
  axe_rate numeric(5,2) not null check (axe_rate >= 0),
  created_at timestamptz not null default now(),
  primary key (schedule_id, sourcing_model, tenure),
  check (agent_rate + referrer_rate + axe_rate = 50)   -- each side is worth 50 points
);

-- ===========================================================================
-- 6.10 closings (Super Admin only)
-- ===========================================================================
create sequence public.closing_no_seq as bigint start 1;

create table public.closings (
  id uuid primary key default gen_random_uuid(),
  closing_no bigint unique not null default nextval('public.closing_no_seq'),
  closing_date date not null,
  deal_type public.deal_type not null,
  lead_id uuid references public.leads (id),
  property_id uuid references public.properties (id),
  closing_agent_id uuid references public.agents (id),   -- legacy, informational
  lead_side_agent_id uuid references public.agents (id),
  listing_side_agent_id uuid references public.agents (id),
  monthly_rent numeric(16,2),
  total_deal_value numeric(16,2),
  deal_currency public.currency,
  usd_lkr_rate numeric(12,4) check (usd_lkr_rate is null or usd_lkr_rate > 0),
  lease_start_date date,
  lease_end_date date,
  rent_advance_months numeric(5,2),
  security_deposit_months numeric(5,2),
  gross_commission numeric(16,2),        -- total commission on the deal before any co-broke split
  our_commission numeric(16,2),          -- Axe's company-side commission after co-broke split
  commission_currency public.currency,
  payment_method_legacy public.payment_method,  -- Airtable single value; receipts replace it
  co_broke_external_agent_id uuid references public.external_agents (id),
  co_broke_split_pct numeric(5,2),
  lead_side_referral_partner_id uuid references public.referral_partners (id),
  listing_side_referral_partner_id uuid references public.referral_partners (id),
  lead_side_paid_to_referrer numeric(16,2),
  listing_side_paid_to_referrer numeric(16,2),
  commission_schedule_id uuid references public.commission_schedules (id),
  notes text,
  -- snapshots (written by the commission engine on save, Phase 3)
  lead_sourcing_model public.sourcing_model,
  listing_sourcing_model public.sourcing_model,
  lead_agent_tenure public.agent_tenure,
  listing_agent_tenure public.agent_tenure,
  lead_agent_exempt boolean,
  listing_agent_exempt boolean,
  lead_agent_rate numeric(5,2), lead_referrer_rate numeric(5,2), lead_axe_rate numeric(5,2),
  listing_agent_rate numeric(5,2), listing_referrer_rate numeric(5,2), listing_axe_rate numeric(5,2),
  lead_agent_payout numeric(16,2), lead_referrer_payout numeric(16,2), lead_axe_payout numeric(16,2),
  listing_agent_payout numeric(16,2), listing_referrer_payout numeric(16,2), listing_axe_payout numeric(16,2),
  agent_total numeric(16,2), referrer_total numeric(16,2), axe_total numeric(16,2),
  split_delta numeric(16,2),             -- our_commission - (agent + referrer + axe); |delta| <= 1 is balanced
  split_override_reason text,
  monthly_rent_usd numeric(16,2),
  total_deal_value_usd numeric(16,2),
  rent_per_sqft_usd numeric(12,4),       -- internal only (moat rule)
  sale_price_per_sqft_usd numeric(12,4), -- internal only (moat rule)
  -- denormalised for reporting
  snap_location_id uuid, snap_development_id uuid, snap_beds smallint,
  snap_furnished public.furnishing, snap_property_type public.property_type, snap_square_feet numeric(10,2),
  snap_lead_source_type public.source_type,
  snap_property_source_channel_id uuid, snap_lead_source_channel_id uuid,
  airtable_id text unique,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);
alter sequence public.closing_no_seq owned by public.closings.closing_no;
create index closings_date_idx on public.closings (closing_date);

-- Split commission receipts: a closing's commission may arrive in parts,
-- in USD and LKR, by bank transfer, cash, cheque or card.
create table public.commission_receipts (
  id uuid primary key default gen_random_uuid(),
  closing_id uuid not null references public.closings (id),
  received_on date not null,
  amount numeric(16,2) not null check (amount > 0),
  currency public.currency not null,
  method public.payment_method not null,
  usd_lkr_rate numeric(12,4) not null check (usd_lkr_rate > 0),  -- converts every line for USD and LKR totals
  received_by_agent_id uuid references public.agents (id),
  received_into text,                    -- bank account / who holds the cash
  reference text,
  notes text,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz,
  constraint receipts_cash_needs_receiver check (
    method <> 'cash' or received_by_agent_id is not null or nullif(trim(received_into), '') is not null
  )
);
create index commission_receipts_closing_idx on public.commission_receipts (closing_id);

create table public.commission_payouts (
  id uuid primary key default gen_random_uuid(),
  closing_id uuid not null references public.closings (id),
  payee_type public.payee_type not null,
  payee_agent_id uuid references public.agents (id),
  payee_referral_partner_id uuid references public.referral_partners (id),
  side public.deal_side not null,
  amount numeric(16,2) not null,
  currency public.currency not null,
  withholding_tax numeric(16,2),
  due_date date,
  paid_on date,
  cycle text,                            -- e.g. 2026-11-10
  notes text,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz,
  check (
    (payee_type = 'agent' and payee_agent_id is not null and payee_referral_partner_id is null)
    or (payee_type = 'referrer' and payee_referral_partner_id is not null and payee_agent_id is null)
  )
);

-- ===========================================================================
-- 6.11 marketing leads
-- ===========================================================================
create table public.marketing_leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  whatsapp text,
  audience_type public.marketing_audience,
  development_or_area text,
  source_id uuid references public.marketing_sources (id),
  status public.marketing_status not null default 'new',
  marketing_opt_in boolean not null default false,
  submitted_at timestamptz,
  promoted_to_owner_id uuid references public.owners (id),
  promoted_to_lead_id uuid references public.leads (id),
  promoted_to_external_agent_id uuid references public.external_agents (id),
  promoted_to_referral_partner_id uuid references public.referral_partners (id),
  notes text,
  utm_source text, utm_medium text, utm_campaign text, fbclid text,
  airtable_id text unique,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);
create unique index marketing_leads_email_key on public.marketing_leads (lower(email));

-- ===========================================================================
-- 6.12 targets
-- ===========================================================================
create table public.agent_targets (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id),
  metric text not null check (metric in ('viewings', 'properties_sourced', 'closings')),
  period text not null check (period in ('week', 'month')),
  target_value numeric(10,2) not null check (target_value >= 0),
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);

create table public.company_targets (
  id uuid primary key default gen_random_uuid(),
  metric text not null default 'revenue_lkr' check (metric in ('revenue_lkr')),
  period text not null default 'month' check (period in ('month')),
  target_value numeric(16,2) not null check (target_value >= 0),
  effective_from date not null,
  effective_to date,
  notes text,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);
comment on table public.company_targets is 'Revenue = total commission - external co-broke - external referral fees. Internal agent payouts stay in.';

-- ===========================================================================
-- 6.13 supporting tables
-- ===========================================================================
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  type public.activity_type not null,
  summary text not null,
  at timestamptz not null default now(),
  by_agent_id uuid references public.agents (id),
  lead_id uuid references public.leads (id),
  owner_id uuid references public.owners (id),
  property_id uuid references public.properties (id),
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz,
  check (num_nonnulls(lead_id, owner_id, property_id) >= 1)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  details text,
  due_on date,
  status public.task_status not null default 'open',
  assignee_agent_id uuid references public.agents (id),
  lead_id uuid references public.leads (id),
  owner_id uuid references public.owners (id),
  property_id uuid references public.properties (id),
  viewing_id uuid references public.viewings (id),
  completed_at timestamptz,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);
create index tasks_assignee_idx on public.tasks (assignee_agent_id, status);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_agent_id uuid not null references public.agents (id),
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  email_status text,                     -- queued / sent / failed
  email_sent_at timestamptz,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);
create index notifications_recipient_idx on public.notifications (recipient_agent_id, read_at);

create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form text not null,                    -- property_inquiry, list_your_property, contact, report
  payload jsonb not null,
  ip_hash text,
  user_agent text,
  processed_at timestamptz,
  processing_error text,
  created_record_table text,
  created_record_id uuid,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);

create table public.match_results (
  id uuid primary key default gen_random_uuid(),
  source_table text not null check (source_table in ('leads', 'properties')),
  source_id uuid not null,
  matched_table text not null check (matched_table in ('leads', 'properties', 'owners')),
  matched_id uuid not null,
  rank smallint not null,
  reason text,
  run_id uuid not null,
  model text,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);
create index match_results_source_idx on public.match_results (source_table, source_id, created_at desc);

create table public.report_editions (
  id uuid primary key default gen_random_uuid(),
  quarter text not null unique,          -- e.g. 2026-Q4
  data_window_end date not null,
  band_values jsonb,                     -- area-tier bands only (moat rule)
  sample_size int,
  pdf_path text,                         -- generated automatically on approval
  status text not null default 'draft' check (status in ('draft', 'approved', 'published')),
  approved_by uuid,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);

create table public.settings (
  key text primary key,
  value jsonb not null,
  description text,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);

-- Airtable user -> new agent mapping, used once by the migration script.
create table public.airtable_user_map (
  airtable_user_id text primary key,
  airtable_email text,
  airtable_name text,
  agent_id uuid references public.agents (id),
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);

-- ===========================================================================
-- USD/LKR exchange rate: one central place for every conversion
-- (commission receipts, closings, revenue target, website price filters).
-- A daily job stores the online rate ('auto'); a Super Admin can override it
-- ('manual') until a chosen date or until the override is removed.
-- ===========================================================================
create table public.fx_rates (
  id uuid primary key default gen_random_uuid(),
  rate_date date not null,               -- the day this rate applies from
  usd_lkr numeric(12,4) not null check (usd_lkr between 50 and 2000),
  source public.fx_source not null,
  provider text,                         -- e.g. open.er-api.com
  pinned_until date,                     -- manual only: override ends after this date (null = until removed)
  note text,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz,
  check (source = 'manual' or pinned_until is null)
);
create unique index fx_rates_auto_daily on public.fx_rates (rate_date) where source = 'auto' and deleted_at is null;

-- ===========================================================================
-- 6.14 audit log
-- ===========================================================================
create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text not null,
  action public.audit_action not null,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  before jsonb,
  after jsonb,
  source public.change_source not null default 'app'
);
create index audit_log_record_idx on public.audit_log (table_name, record_id, changed_at desc);
create index audit_log_changed_at_idx on public.audit_log (changed_at desc);
