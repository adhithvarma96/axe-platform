-- Plain-English notes on key tables (shown in the Supabase table editor).
comment on table public.fx_rates is
  'Central USD/LKR rate. Daily automatic rate from open.er-api.com; a Super Admin manual row overrides it until pinned_until (or until removed). Used by receipts, closings, revenue target and website price filters.';
comment on table public.commission_receipts is
  'Part payments of a closing''s commission: date, amount, USD/LKR, method, exchange rate per line, who received cash.';
comment on table public.role_permissions is
  'Who can do what on which table. Read by app.can() in every row-level security policy. Change with care.';
