-- Helpers for the Airtable import (scripts/migrate-airtable.mjs).
-- Callable only with the service (secret) key; never by signed-in users or the website.

create or replace function public.admin_sync_sequences()
returns void
language sql security definer
set search_path = ''
as $$ select app.sync_sequences() $$;

revoke all on function public.admin_sync_sequences() from public, anon, authenticated;
grant execute on function public.admin_sync_sequences() to service_role;

comment on function public.admin_sync_sequences() is
  'Moves listing/lead/viewing/closing counters past the highest imported number. Service role only.';
