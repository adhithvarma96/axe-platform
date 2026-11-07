-- Copy for website pages that are not a location or development (hub, rent/sale,
-- lifestyle, about ...), carried over from the live site and editable later.
create table public.site_pages (
  path text primary key,                -- e.g. /lifestyle/penthouse-apartments-for-sale-rent/
  kind text not null check (kind in ('hub', 'intent', 'lifestyle', 'page')),
  title text,                           -- <title>
  meta_description text,
  h1 text,
  intro text,
  body text,                            -- simple markup: "## heading", "- bullet", blank-line paragraphs
  source_url text,                      -- live page it was carried over from
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz
);

alter table public.site_pages enable row level security;
create policy p_select on public.site_pages for select to authenticated
  using (app.can('site_pages', 'select') and (deleted_at is null or app.can('site_pages', 'delete')));
create policy p_insert on public.site_pages for insert to authenticated with check (app.can('site_pages', 'insert'));
create policy p_update on public.site_pages for update to authenticated using (app.can('site_pages', 'update')) with check (app.can('site_pages', 'update'));
create policy p_delete on public.site_pages for delete to authenticated using (app.can('site_pages', 'delete'));
create trigger t10_stamp before insert or update on public.site_pages for each row execute function app.stamp();
create trigger t20_soft_delete before insert or update on public.site_pages for each row execute function app.guard_soft_delete();
create trigger z90_audit after insert or update or delete on public.site_pages for each row execute function app.audit();
grant select, insert, update, delete on public.site_pages to authenticated;
grant all on public.site_pages to service_role;

insert into public.role_permissions values
  ('super_admin', 'site_pages', true, true, true, true),
  ('sales_manager', 'site_pages', true, false, false, false),
  ('agent', 'site_pages', true, false, false, false),
  ('data_entry', 'site_pages', true, false, false, false);

create view public.web_pages with (security_invoker = false) as
select path, kind, title, meta_description, h1, intro, body
from public.site_pages where deleted_at is null;
grant select on public.web_pages to anon, authenticated;
