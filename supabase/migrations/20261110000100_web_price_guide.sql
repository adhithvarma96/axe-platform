-- Price guide for area and building pages (Adhith, 10 Nov 2026): publish a rounded bracket, never exact figures.
-- Brackets come from the apartments Axe has marketed in the last 24 months (any status except withdrawn):
-- the middle 60% of asking prices (20th to 80th percentile), rounded outward to coarse steps.
-- A figure appears only when at least 4 apartments stand behind it. No row-level value ever leaves the database.

create view public.web_price_guide with (security_invoker = false) as
with base as (
  select
    l.slug as location_slug,
    d.slug as development_slug,
    app.to_usd(p.asking_rent, p.rent_currency) as rent_usd,
    app.to_lkr(p.asking_sale_price, p.sale_currency) as sale_lkr,
    p.square_feet
  from public.properties p
  left join public.locations l on l.id = p.location_id and l.deleted_at is null
  left join public.developments d on d.id = p.development_id and d.deleted_at is null
  where p.deleted_at is null
    and p.property_type = 'apartment'
    and not p.price_on_request
    and p.status <> 'withdrawn'
    and p.created_at >= now() - interval '24 months'
),
clean as (
  -- drop obvious typing errors (e.g. square feet entered as bedrooms, rent entered in the wrong currency)
  select
    location_slug,
    development_slug,
    case when rent_usd between 200 and 50000 then rent_usd end as rent_usd,
    case when sale_lkr >= 5000000 then sale_lkr end as sale_lkr,
    case when square_feet >= 300 and rent_usd between 200 and 50000 and rent_usd / square_feet between 0.2 and 10
         then rent_usd / square_feet end as rent_psf
  from base
),
scoped as (
  select 'location'::text as scope, location_slug as slug, rent_usd, sale_lkr, rent_psf from clean where location_slug is not null
  union all
  select 'development'::text, development_slug, rent_usd, sale_lkr, rent_psf from clean where development_slug is not null
)
select
  scope,
  slug,
  case when count(rent_usd) >= 4 then (floor(percentile_cont(0.2) within group (order by rent_usd) / 100) * 100)::int end as rent_usd_low,
  case when count(rent_usd) >= 4 then (ceil(percentile_cont(0.8) within group (order by rent_usd) / 100) * 100)::int end as rent_usd_high,
  case when count(sale_lkr) >= 4 then (floor(percentile_cont(0.2) within group (order by sale_lkr) / 5000000) * 5000000)::bigint end as sale_lkr_low,
  case when count(sale_lkr) >= 4 then (ceil(percentile_cont(0.8) within group (order by sale_lkr) / 5000000) * 5000000)::bigint end as sale_lkr_high,
  case when count(rent_psf) >= 4 then round((floor(percentile_cont(0.2) within group (order by rent_psf) * 20) / 20)::numeric, 2) end as rent_psf_low,
  case when count(rent_psf) >= 4 then round((ceil(percentile_cont(0.8) within group (order by rent_psf) * 20) / 20)::numeric, 2) end as rent_psf_high
from scoped
group by scope, slug
having count(rent_usd) >= 4 or count(sale_lkr) >= 4;

comment on view public.web_price_guide is
  'Public: rounded asking-price brackets per location/development (middle 60%, min 4 apartments). No row-level data.';

grant select on public.web_price_guide to anon, authenticated;
