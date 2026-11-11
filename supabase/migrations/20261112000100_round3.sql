-- Axe Realty OS, review round 3 (Adhith, 11 Nov 2026)
--   1. "Available from" retired: "Next available" is the one availability date
--   2. Rented units freeing up within 60 days can be on the website as "Coming soon"
--   3. Agent profile for the website: photo, title, bio, show on the team page
--   4. Google reviews shown on the website (typed in, managed in the CRM)
--   5. WhatsApp taps from the website, logged so the agent can be nudged to log the lead

-- 1 ------------------------------------------------------------------------
update public.properties set next_available_date = available_from
where next_available_date is null and available_from is not null and deleted_at is null;
comment on column public.properties.available_from is 'Retired 12 Nov 2026: use next_available_date. Kept for history only.';

create or replace function app.colombo_today()
returns date language sql stable set search_path = ''
as $$ select (now() at time zone 'Asia/Colombo')::date $$;
grant execute on function app.colombo_today() to anon, authenticated;

-- 3 ------------------------------------------------------------------------
alter table public.agents
  add column public_title text,
  add column public_bio text,
  add column public_photo jsonb,
  add column public_email text,
  add column show_on_website boolean not null default false,
  add column website_sort int not null default 100;
comment on column public.agents.public_photo is 'Headshot on the website (photo pipeline variants). Square, at least 800 x 800.';

-- 2 + 3: listings view (columns appended at the end; earlier ones unchanged in name and order)
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
  coalesce(t.name, p.tower_name_legacy) as tower_name
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

-- team page
create or replace view public.web_team with (security_invoker = false) as
select a.id, a.public_name as name, a.public_title as title, a.public_bio as bio,
  app.public_variants(a.public_photo) as photo, a.public_whatsapp as whatsapp, a.public_email as email, a.website_sort
from public.agents a
where a.show_on_website and a.status = 'active' and a.deleted_at is null and a.public_name is not null;
grant select on public.web_team to anon, authenticated;

-- 4 ------------------------------------------------------------------------
create table public.site_reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_name text not null,
  rating int not null default 5 check (rating between 1 and 5),
  body text not null,
  review_date date,
  source text not null default 'google',
  is_published boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);
comment on table public.site_reviews is 'Client reviews shown on the website (copied from Google with the wording unchanged).';
revoke all on public.site_reviews from anon;
grant select, insert, update, delete on public.site_reviews to authenticated;
grant all on public.site_reviews to service_role;
alter table public.site_reviews enable row level security;
create policy p_select on public.site_reviews for select to authenticated using (app.can('site_reviews', 'select'));
create policy p_insert on public.site_reviews for insert to authenticated with check (app.can('site_reviews', 'insert'));
create policy p_update on public.site_reviews for update to authenticated using (app.can('site_reviews', 'update')) with check (app.can('site_reviews', 'update'));
create policy p_delete on public.site_reviews for delete to authenticated using (app.can('site_reviews', 'delete'));
insert into public.role_permissions values
  ('super_admin', 'site_reviews', true, true, true, true)
on conflict (role, resource) do nothing;
create trigger t10_stamp before insert or update on public.site_reviews for each row execute function app.stamp();
create trigger t20_soft_delete before insert or update on public.site_reviews for each row execute function app.guard_soft_delete();
create trigger z90_audit after insert or update or delete on public.site_reviews for each row execute function app.audit();

create or replace view public.web_reviews with (security_invoker = false) as
select reviewer_name, rating, body, review_date, source
from public.site_reviews where is_published and deleted_at is null
order by sort_order, review_date desc nulls last;
grant select on public.web_reviews to anon, authenticated;

-- the five Google reviews Adhith sent on 11 Nov 2026 (dates approximate, from "x ago")
insert into public.site_reviews (reviewer_name, rating, body, review_date, sort_order) values
  ('Pramukshi Kariyawasam', 5, 'I cannot recommend Axe Realty enough! From the moment I reached out, Adhith was on it immediately, finding me the perfect listing without any delay and making the entire process completely stress-free. What really stood out was how well he understood exactly what I was looking for. The very first place he suggested ended up being the one, and I absolutely love where I''m living now. That says everything about how well he listened and how well he knows the market. The service was prompt, professional and genuinely personal, not just transactional. Adhith went above and beyond to make sure everything came together smoothly, from the initial search right through to getting the conversations going with the right people. Adhith and the Axe Realty team made what can be a stressful process feel effortless. Genuinely grateful for the help.', '2026-10-11', 10),
  ('Reagan Young', 5, 'Sabry & Adhith at Axe Realty did an AMAZING job helping us find several flats. They are friendly, helpful and most importantly hard working. I am extremely thankful for Axe Realty and the effort they put in to make sure we found flats that fit everything we were looking for. They are easy to get in contact with and were motivated to help find the best flats for us. I highly recommend Axe Realty!', '2026-10-21', 20),
  ('Priyanka Abeygunawardane', 5, 'I had a great experience working with Adhith from Axe Realty. He had a good selection of apartments available and quickly understood my requirements and helped me find the right one. His punctuality, prompt responses, and availability throughout the process were excellent. He handled everything professionally from the initial search through to closing the deal. What I appreciate most is that his support and responsiveness have continued even after the purchase was completed. I highly recommend Adhith for his reliable and professional service.', '2026-10-11', 30),
  ('S Disanayake', 5, 'We had a very positive experience working with AXE Realty when we wanted to rent out our apartment. They were extremely professional, reliable, and very easy to work with throughout the entire process. They were always available whenever we needed assistance and took the time to understand our requirements. Most importantly, they found suitable tenants who matched what we were looking for. The entire rental process was handled professionally and efficiently, with excellent communication from start to finish. We truly appreciated their dedication and support and would highly recommend their services to anyone looking to rent or manage a property.', '2026-10-11', 40),
  ('Eranda Kotelawala', 5, 'I want to write my own experience with Axe Realty, especially how Adhith assisted me to find the kind of tenant I wanted for my unit. Being a very hard call for the type of tenant, Adith was the only person who was able to do that and I am satisfied how he engaged himself through the whole process. After a long time I was able to see someone professional in the job. Highly recommended!', '2026-08-11', 50);

-- 5 ------------------------------------------------------------------------
create table public.whatsapp_clicks (
  id uuid primary key default gen_random_uuid(),
  clicked_at timestamptz not null default now(),
  property_id uuid references public.properties (id),
  listing_no text,
  agent_id uuid references public.agents (id),   -- whose WhatsApp the visitor was sent to (null = company number)
  page text,                                      -- where on the site the button was
  lead_logged_at timestamptz                      -- set when a lead for this listing is logged by that agent afterwards
);
create index whatsapp_clicks_agent_idx on public.whatsapp_clicks (agent_id, clicked_at desc);
comment on table public.whatsapp_clicks is 'Taps on WhatsApp buttons on the website. No visitor details are stored (no IP, no phone).';
revoke all on public.whatsapp_clicks from anon;
grant select on public.whatsapp_clicks to authenticated;
grant all on public.whatsapp_clicks to service_role;
alter table public.whatsapp_clicks enable row level security;
create policy p_select on public.whatsapp_clicks for select to authenticated
  using (app.can('whatsapp_clicks', 'select') or agent_id = (select a.id from public.agents a where a.user_id = auth.uid()));
insert into public.role_permissions values
  ('super_admin', 'whatsapp_clicks', true, false, false, false),
  ('sales_manager', 'whatsapp_clicks', true, false, false, false)
on conflict (role, resource) do nothing;
create trigger z90_audit after insert or update or delete on public.whatsapp_clicks for each row execute function app.audit();
