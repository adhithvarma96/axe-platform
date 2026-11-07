-- Public website data (SPEC 3.5, 11.3): an explicit allow-list.
-- The website's anonymous role still has NO access to any table. It may read
-- only these views (published, Available/Reserved listings; safe columns) and
-- call web_gallery(token). Views run with their owner's rights, so they can
-- read the tables while exposing nothing beyond the columns listed here.

-- ---------------------------------------------------------------------------
-- Gallery links for WhatsApp shares (SPEC 7.12): unguessable, per listing,
-- can be switched off.
-- ---------------------------------------------------------------------------
alter table public.properties
  add column gallery_token text not null unique
    default substr(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 1, 24),
  add column gallery_enabled boolean not null default true;

create or replace function app.slugify(s text)
returns text language sql immutable set search_path = ''
as $$ select trim(both '-' from regexp_replace(lower(coalesce(s, '')), '[^a-z0-9]+', '-', 'g')) $$;

-- Website address of a listing: kept slug if one exists, else listing-no-development-location.
create or replace function app.listing_slug(listing_no text, web_slug text, dev text, loc text)
returns text language sql immutable set search_path = ''
as $$
  select coalesce(nullif(web_slug, ''),
    trim(both '-' from regexp_replace(lower(listing_no) || '-' || app.slugify(dev) || '-' || app.slugify(loc), '-+', '-', 'g')))
$$;

-- Photo sizes the website may use (drops storage keys and byte counts).
create or replace function app.public_variants(v jsonb)
returns jsonb language sql immutable set search_path = ''
as $$
  select coalesce(jsonb_object_agg(k, jsonb_build_object('url', v -> k ->> 'url', 'width', (v -> k ->> 'width')::int, 'height', (v -> k ->> 'height')::int)), '{}'::jsonb)
  from jsonb_object_keys(coalesce(v, '{}'::jsonb)) as k
  where k in ('400', '800', '1600', '2048', 'full', 'share')
$$;

-- ---------------------------------------------------------------------------
-- Listings
-- ---------------------------------------------------------------------------
create view public.web_listings with (security_invoker = false) as
select
  p.listing_no,
  app.listing_slug(p.listing_no, p.web_slug, d.name, l.name) as slug,
  p.property_type,
  p.status,
  p.listing_types,
  p.condition,
  p.beds,
  p.baths,
  p.parking,
  p.square_feet,
  p.furnished,
  p.price_on_request,
  case when p.price_on_request then null else p.asking_rent end as asking_rent,
  case when p.price_on_request then null else p.rent_currency end as rent_currency,
  case when p.price_on_request then null else p.asking_sale_price end as asking_sale_price,
  case when p.price_on_request then null else p.sale_currency end as sale_currency,
  case when p.price_on_request then null else app.to_usd(p.asking_rent, p.rent_currency) end as rent_usd,
  case when p.price_on_request then null else app.to_lkr(p.asking_rent, p.rent_currency) end as rent_lkr,
  case when p.price_on_request then null else app.to_usd(p.asking_sale_price, p.sale_currency) end as sale_usd,
  case when p.price_on_request then null else app.to_lkr(p.asking_sale_price, p.sale_currency) end as sale_lkr,
  p.available_from,
  p.public_notes,
  -- type-specific facts that are safe to publish
  p.land_extent_perches, p.built_up_area_sqft, p.number_of_floors, p.garden, p.pool, p.sea_view,
  p.total_floor_area_sqft, p.commercial_sub_category,
  l.name as location_name,
  l.slug as location_slug,
  l.market_tier,
  d.name as development_name,
  d.slug as development_slug,
  coalesce((select array_agg(f.slug order by f.sort_order) from public.property_feature_links fl
            join public.property_features f on f.id = fl.feature_id and f.deleted_at is null
            where fl.property_id = p.id), '{}') as features,
  (select app.public_variants(ph.variants) from public.property_photos ph
    where ph.property_id = p.id and ph.is_public and ph.deleted_at is null
    order by ph.is_cover desc, ph.sort_order limit 1) as cover,
  coalesce((select jsonb_agg(app.public_variants(ph.variants) order by ph.sort_order) from public.property_photos ph
    where ph.property_id = p.id and ph.is_public and ph.deleted_at is null), '[]'::jsonb) as photos,
  a.public_name as agent_name,
  a.public_whatsapp as agent_whatsapp,
  p.website_published_at as published_at,
  p.updated_at
from public.properties p
left join public.locations l on l.id = p.location_id and l.deleted_at is null
left join public.developments d on d.id = p.development_id and d.deleted_at is null
left join public.agents a on a.id = p.listing_agent_id and a.status = 'active' and a.deleted_at is null
where p.website_published
  and p.status in ('available', 'reserved')
  and p.deleted_at is null;

comment on view public.web_listings is 'Public website listings: allow-listed columns of published Available/Reserved properties only.';

-- ---------------------------------------------------------------------------
-- Locations and developments with a website page (slug set)
-- ---------------------------------------------------------------------------
create view public.web_locations with (security_invoker = false) as
select l.name, l.slug, l.market_tier, l.seo_title, l.seo_meta_description, l.seo_intro, l.seo_body, l.seo_faq,
  (select count(*) from public.web_listings w where w.location_slug = l.slug)::int as listing_count
from public.locations l
where l.slug is not null and l.deleted_at is null;

create view public.web_developments with (security_invoker = false) as
select d.name, d.slug, d.development_status, d.year_completed, d.developer_builder, d.hero_image_path,
  d.seo_title, d.seo_meta_description, d.seo_intro, d.seo_body, d.seo_faq,
  l.name as location_name, l.slug as location_slug,
  (select count(*) from public.web_listings w where w.development_slug = d.slug)::int as listing_count
from public.developments d
left join public.locations l on l.id = d.location_id
where d.slug is not null and d.deleted_at is null;

create view public.web_fx with (security_invoker = false) as
select app.usd_lkr_on() as usd_lkr, (now() at time zone 'Asia/Colombo')::date as rate_date;

-- ---------------------------------------------------------------------------
-- Client gallery (WhatsApp "Property Pictures Link"). One listing per secret
-- token; works whether or not the listing is on the website; never returns
-- owner, unit number, floor or anything internal.
-- ---------------------------------------------------------------------------
create or replace function public.web_gallery(p_token text)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'listing_no', p.listing_no,
    'property_type', p.property_type,
    'listing_types', p.listing_types,
    'beds', p.beds, 'baths', p.baths, 'square_feet', p.square_feet, 'furnished', p.furnished,
    'development_name', d.name, 'location_name', l.name,
    'agent_name', a.public_name, 'agent_whatsapp', a.public_whatsapp,
    'photos', coalesce((select jsonb_agg(app.public_variants(ph.variants) order by ph.sort_order)
                        from public.property_photos ph
                        where ph.property_id = p.id and ph.is_public and ph.deleted_at is null), '[]'::jsonb)
  )
  from public.properties p
  left join public.locations l on l.id = p.location_id
  left join public.developments d on d.id = p.development_id
  left join public.agents a on a.id = p.listing_agent_id and a.status = 'active'
  where p.gallery_token = p_token
    and p.gallery_enabled
    and p.deleted_at is null
    and length(p_token) >= 20
$$;

-- ---------------------------------------------------------------------------
-- Grants: the views and the gallery function, nothing else.
-- ---------------------------------------------------------------------------
grant select on public.web_listings, public.web_locations, public.web_developments, public.web_fx to anon, authenticated;
grant execute on function public.web_gallery(text) to anon, authenticated;
-- The views call these helpers; anon needs to be allowed to run them (not the tables behind them).
grant usage on schema app to anon;
grant execute on function app.slugify(text), app.listing_slug(text, text, text, text), app.public_variants(jsonb),
  app.usd_lkr_on(date), app.to_usd(numeric, public.currency, date), app.to_lkr(numeric, public.currency, date) to anon;

-- the gallery token is internal to staff screens; agents may read it to build share links
comment on column public.properties.gallery_token is 'Secret code in the client gallery link axerealty.lk/g/{token}. Regenerate to revoke old links.';
