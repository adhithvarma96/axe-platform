-- Listing advisor card: an Email button needs the agent's website email (agents.public_email,
-- set on Team & targets). Appended to the end of web_listings; nothing else changes.
create or replace view public.web_listings with (security_invoker = false) as
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
  case when p.status = 'rented' then p.next_available_date end as available_from,
  p.public_notes,
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
  p.updated_at,
  (p.status = 'rented') as coming_soon,
  app.public_variants(a.public_photo) as agent_photo,
  a.public_title as agent_title,
  coalesce(t.name, p.tower_name_legacy) as tower_name,
  a.public_email as agent_email
from public.properties p
left join public.locations l on l.id = p.location_id and l.deleted_at is null
left join public.developments d on d.id = p.development_id and d.deleted_at is null
left join public.development_towers t on t.id = p.tower_id and t.deleted_at is null
left join public.agents a on a.id = p.listing_agent_id and a.status = 'active' and a.deleted_at is null
where p.website_published
  and p.deleted_at is null
  and p.property_type::text = any (app.website_types())
  and (p.status in ('available', 'reserved')
       or (p.status = 'rented' and p.next_available_date between app.colombo_today() and app.colombo_today() + 60));
