# Axe Realty platform

One Next.js + Supabase codebase that replaces the Airtable CRM ("Axe Realty OS"),
the WordPress site axerealty.lk and the Make.com automations.
The full brief is `SPEC.md` in the parent folder.

| Surface | Domain | Status |
| --- | --- | --- |
| Internal app | app.axerealty.lk | Phase 0: sign-in, 2FA, database foundations |
| Public website | axerealty.lk | Phase 1 |

## Run it locally

Needs Node 22 or newer.

```bash
npm install
cp .env.example .env.local   # then fill in the staging Supabase URL and publishable key
npm run dev                  # http://localhost:3000
```

Local work points at the **staging** Supabase project. Nobody develops against production.

## Checks (CI runs the same on every push)

```bash
npm run typecheck
npm run lint
npm test        # applies every migration to an in-process Postgres and tests RLS, audit, IDs
npm run build
```

The database tests need no Docker and no Supabase account: `tests/db/harness.ts`
runs the real migrations on PGlite with a small stand-in for Supabase Auth.

## Database changes

Migrations live in `supabase/migrations/` and are the only way the schema changes.

```bash
npx supabase migration new describe_the_change   # write SQL in the new file
npm test                                         # must stay green
npx supabase db push --remote                    # staging (CI also does this on main)
```

Production is pushed by hand after Adhith approves staging. See `docs/RUNBOOK.md`.

## Where things are

- `supabase/migrations/` — schema, row-level security, triggers, reference data
- `src/proxy.ts` — refreshes the session and sends signed-out visitors to /login
- `src/lib/supabase/` — server and browser clients, current-user helper
- `src/app/` — pages (login, 2FA, Phase 0 home)
- `tests/db/` — database security tests
- `docs/ARCHITECTURE.md` — how the pieces fit
- `docs/SCHEMA.md` — the data model in plain English (for review)
- `docs/RUNBOOK.md` — restore a backup, rotate a key, add a user, change commission rates
