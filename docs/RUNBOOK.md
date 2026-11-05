# Runbook

Plain-English procedures. Keep this current with each phase.

## Add a team member

1. Supabase (production) → Authentication → Users → **Invite user** with their @axerealty.lk email.
   (Public sign-up is switched off; invites are the only way in.)
2. Supabase → Table editor → `agents` → insert a row: `user_id` = the new user's id, `full_name`, `role`
   (`agent`, `data_entry` or `super_admin`), `work_email`, `weekly_day_off`.
3. Employment terms and HR details go in `agent_hr` (Super Admin only): `date_joined`, `probation_end_date`
   (join date + 90 days for sales associates), `commission_exempt` (true only for the founder), personal contact.
4. They accept the invite, set a password (12+ characters, upper, lower and digits), and sign in.
   A Super Admin is sent to 2FA setup on first sign-in.

The Team screen (Phase 2) will replace steps 2–3.

## Deactivate a team member

Set `agents.status = 'inactive'`. They lose access immediately at the database (RLS), even with a live session.
Their records stay attached to them.

## Rotate a key

| Key | Where it lives | Steps |
| --- | --- | --- |
| Anthropic `axe-platform` | Vercel env `ANTHROPIC_API_KEY` | Create a new key in console.anthropic.com → paste into Vercel (Production + Preview) → redeploy → delete the old key. Expiry: 12 months; reminder 2 weeks before. |
| Supabase secret key | Vercel env `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → create new secret key → update Vercel → redeploy → revoke old. |
| Airtable PAT (migration) | local `.env.local` only | airtable.com/create/tokens → regenerate → update `.env.local`. Delete it after cutover. |
| Resend | Vercel env `RESEND_API_KEY` | Create new → update Vercel → redeploy → delete old. |

Never paste a key into code, chat, Airtable scripts or Make.

## Ship a database change

1. `npx supabase migration new <name>`, write the SQL, run `npm test`.
2. Merge to `main`: CI tests it and pushes it to **staging**.
3. Adhith checks staging.
4. Production: `npx supabase link --project-ref <production ref>` then `npx supabase db push`.
   Take a manual backup first (Supabase → Database → Backups) if the change alters or drops data.

## Restore a backup

**Daily backups (Supabase Pro, 7 days kept):** Supabase → Database → Backups → pick the day → Restore.
This replaces the whole database; the app is unavailable for a few minutes.

**Point-in-time recovery** (to the minute) is a paid add-on; enable it before go-live of the CRM (Phase 2).

**Monthly off-platform dump** (GitHub → Actions → "Monthly off-platform backup" → artifact):

```bash
gpg --decrypt axe-db-YYYY-MM-DD.tgz.gpg > backup.tgz   # passphrase: BACKUP_PASSPHRASE (in your password manager)
tar xzf backup.tgz
psql "$TARGET_DATABASE_URL" -f backup/roles.sql
psql "$TARGET_DATABASE_URL" -f backup/schema.sql
psql "$TARGET_DATABASE_URL" -c "SET session_replication_role = replica" -f backup/data.sql
```

Test a restore into the staging project once a quarter and note the date here.

| Restore test date | Backup used | Result |
| --- | --- | --- |
| — | — | — |

## Change commission rates

Never edit a schedule that has closings against it (the database refuses).

1. Give agents 30 days' written notice (Schedule A).
2. Insert a new `commission_schedules` row: next version number, `effective_from` = the start date.
3. Insert its 8 `commission_schedule_rates` rows (each row's agent + referrer + Axe must equal 50).
4. Set `effective_to` on the previous version to the day before.

Closings dated from the new start use the new version; earlier closings never change.

## USD/LKR exchange rate

One central rate drives every conversion: commission receipts, closings, the revenue target and the
website's price filters (search in LKR, see USD, and the reverse).

- **Automatic:** every day at 06:30 Colombo time `/api/cron/fx` stores the rate from open.er-api.com.
  If the feed fails, yesterday's rate stays in use and Sentry raises an alert.
- **Override:** insert a `fx_rates` row with `source = manual`, the rate, `rate_date` (from when) and
  optionally `pinned_until` (last day it applies). Leave `pinned_until` empty to keep it until you remove it
  (soft-delete the row). A new override automatically ends the previous one. Settings screen: Phase 3.
- **Commission receipts** take the central rate for the day received; type a different rate on the line
  if the bank or client used another one. Stored rates on past receipts never change.

## Change the revenue target

Insert a `company_targets` row with the new monthly amount and `effective_from`; set `effective_to` on the old row.
Settings screen arrives in Phase 3.

## If something breaks

- Errors: Sentry (once `SENTRY_DSN` is set).
- Uptime: monitor `https://app.axerealty.lk/healthz`.
- Logs: Vercel → project → Logs; Supabase → Logs.
