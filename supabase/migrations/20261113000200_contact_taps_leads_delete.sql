-- 1. Website taps now cover Call and Email as well as WhatsApp (Adhith, 13 Nov 2026).
--    visitor: a random id from a browser cookie, only to merge the same person tapping twice
--    within 10 minutes. Nothing personal is stored.
alter table public.whatsapp_clicks
  add column channel text not null default 'whatsapp' check (channel in ('whatsapp', 'call', 'email')),
  add column visitor uuid;
create index whatsapp_clicks_repeat_idx on public.whatsapp_clicks (listing_no, channel, visitor, clicked_at desc);
comment on table public.whatsapp_clicks is 'Taps on the Call, Email and WhatsApp buttons on the website. No visitor details are stored (no IP, no phone); visitor is a random cookie id.';

-- 2. AI matching (SPEC 7.10): a run-level note ("none are in the preferred developments").
alter table public.match_results add column run_note text;
