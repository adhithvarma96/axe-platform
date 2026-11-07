-- Chosen website images (7 Nov 2026): a building photo per development, a landmark per
-- location, and images for website pages (home hero, lifestyle). Falls back to a listing
-- photo on the site when empty. Stored as the photo pipeline's variants JSON.
alter table public.locations add column website_image jsonb;
alter table public.developments add column website_image jsonb;
alter table public.site_pages add column website_image jsonb;

insert into public.site_pages (path, kind, title, h1) values ('/', 'page', 'Apartments for Sale & Rent in Colombo', 'Apartments in Colombo')
on conflict (path) do nothing;

create or replace view public.web_locations with (security_invoker = false) as
select l.name, l.slug, l.market_tier, l.seo_title, l.seo_meta_description, l.seo_intro, l.seo_body, l.seo_faq,
  (select count(*) from public.web_listings w where w.location_slug = l.slug)::int as listing_count,
  app.public_variants(l.website_image) as image
from public.locations l
where l.slug is not null and l.deleted_at is null;

create or replace view public.web_developments with (security_invoker = false) as
select d.name, d.slug, d.development_status, d.year_completed, d.developer_builder, d.hero_image_path,
  d.seo_title, d.seo_meta_description, d.seo_intro, d.seo_body, d.seo_faq,
  l.name as location_name, l.slug as location_slug,
  (select count(*) from public.web_listings w where w.development_slug = d.slug)::int as listing_count,
  app.public_variants(d.website_image) as image
from public.developments d
left join public.locations l on l.id = d.location_id
where d.slug is not null and d.deleted_at is null;

create or replace view public.web_pages with (security_invoker = false) as
select path, kind, title, meta_description, h1, intro, body, app.public_variants(website_image) as image
from public.site_pages where deleted_at is null;

-- every lifestyle page gets a row (sea-view is new and had no live copy)
insert into public.site_pages (path, kind) values
  ('/lifestyle/penthouse-apartments-for-sale-rent/', 'lifestyle'),
  ('/lifestyle/duplex-apartments-for-sale-rent/', 'lifestyle'),
  ('/lifestyle/pet-friendly-apartments-for-sale-rent/', 'lifestyle'),
  ('/lifestyle/sea-view-apartments-for-sale-rent/', 'lifestyle')
on conflict (path) do nothing;
