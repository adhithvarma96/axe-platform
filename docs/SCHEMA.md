# Data model: plain-English review

This is what Phase 0 built, table by table, and who can see it. The SQL is in
`supabase/migrations/`. Every main table also has: created at/by, updated at/by,
a soft-delete date, and an `airtable_id` so the migration can be re-run safely.

## Who sees what

| Area | Super Admin (with 2FA) | Agent | Data Entry | Website visitors |
| --- | --- | --- | --- | --- |
| Properties, owners, developments, locations, towers, photos | Full + delete | Read, add, edit | Read, add, edit | Nothing yet (Phase 1 adds an allow-list) |
| Leads (and their preferred areas/developments/features) | Full + delete | Read, add, edit | **Read and add, no edits** | Nothing |
| Viewings, external agents, referral partners, marketing leads, activities, tasks, AI matches | Full + delete | Read, add, edit | Read-only external agents and referral partners; no viewings | Nothing |
| Stage history, price history, gate breach log | Read | Read | Price history only | Nothing |
| Closings, commission receipts, payouts, schedules, revenue target | Full | **Nothing** | Nothing | Nothing |
| Employment terms (join date, probation end, commission-exempt) and HR details; referral partner NIC numbers | Full | Nothing | Nothing | Nothing |
| USD/LKR rate | Read, override | Read | Read | Via the website's price filters (Phase 1) |
| Team list (names, roles, work email, day off) | Full | Read | Read | Nothing |
| Own targets, own notifications | Full | Own only | Own notifications | Nothing |
| Audit log | Read only | Nothing | Nothing | Nothing |
| Settings and lookup lists | Edit | Read | Read | Nothing |

- A Super Admin who hasn't passed 2FA in this session sees **nothing**, not even properties.
- Only a Super Admin can delete or restore. Deleted rows disappear for everyone else.
- An inactive team member is locked out at the database, even mid-session.
- A future **Sales Manager** role is already defined: agent rights plus read-only closings, commissions and targets.

## Tables

**Team**: `agents` (name, role, status, work email, day off, public name and WhatsApp for the website), `agent_hr` (join date, probation end, commission-exempt, personal contact, address, documents: Super Admin only), `agent_targets`, `company_targets` (LKR 10M/month from 1 Nov 2026).

**Inventory**: `locations` (with website slug, SEO copy, prime-core/outside-core tier), `developments` (slug, SEO copy, hero image), `development_towers` (towers now belong to their development), `facilities`, `properties` (all SPEC 6.7 field groups: common, house/villa, land, villa/short-let, commercial; distribution checklist with dates; `web_slug` keeps existing URLs such as `ax25063-bullers-lane-residencies`), `property_photos` (no duplicates: unique per source file and per image fingerprint; one cover), `price_history`.

**Owners**: `owners` (contact protocol, owner-as-buyer profile), links to the external agents who brought them and the areas they'd buy in.

**Pipeline**: `leads` (all SPEC 6.8 fields, UTM attribution), preferred locations / developments / must-have features, `lead_stage_history`, `gate_items` (the 7 gate requirements as data: add one without code), `lead_gate_ticks` (who ticked what, when), `gate_breach_attempts`.

**Viewings**: `viewings` (time is now a real time; Airtable's free-text time kept alongside for history).

**Money**: `closings` (all inputs + snapshot columns the commission engine fills in Phase 3, including gross commission so revenue can be computed), `commission_receipts` (part payments: date, amount, USD/LKR, bank transfer/cash/cheque/card, exchange rate on every line, who received cash), `commission_payouts` (per agent/referrer per cycle), `commission_schedules` + `commission_schedule_rates` (Schedule A v1.0 from 1 Sep 2026, and a "legacy" schedule before that where 100% goes to Axe).

**Partners**: `external_agents` (+ areas covered as real locations), `referral_partners` (registration time for first-to-register, agreement dates, rate capped at 15%), `referral_partner_private` (NIC: Super Admin only).

**Marketing**: `marketing_leads` (unique by email, promotion links to owner/lead/external agent/referral partner).

**Exchange rate**: `fx_rates`: one daily automatic USD/LKR rate from the internet plus Super Admin overrides (until a date, or until removed). Receipts and closings take the rate for their date unless one is typed in; `app.to_lkr()` / `app.to_usd()` convert prices for the website filters and reports.

**Supporting**: `activities`, `tasks`, `notifications`, `form_submissions` (every website form saved raw first), `match_results` (AI matches as clickable rows), `report_editions` (Colombo Apartment Report; PDF auto-generated on approval), `settings`, `airtable_user_map`, `audit_log`, `role_permissions`.

**Lookup lists you can edit**: source channels (with "applies to leads / properties"), owner sources, referrer categories, property features (Penthouse, Duplex, Pet Friendly, Sea View), provinces, lost reasons, countries (full ISO list), marketing sources.

## Rules already enforced by the database

- Listing No (`AX`/`AXH`/`AXL`/`AXV`/`AXCP` + year + shared sequence) and Lead ID (`ARLD` + year + sequence) are set once and can never change. Migrated codes such as `AX25063` are kept exactly.
- Via-referrer sourcing must name the referral partner (leads and properties).
- Cash commission receipts must say who received the cash.
- Every commission schedule row adds up to 50 points per side; a schedule with closings against it can't be edited.
- Only a Super Admin can set a property's commission structure.
- Every price change and every pipeline move is recorded.

## Coming in later phases (tables exist, logic doesn't yet)

Gate blocking (Phase 2), viewing → lead status moves (Phase 2), 24-hour edit window for agents (Phase 2), change alerts (Phase 2), commission engine and payouts (Phase 3), public website allow-list view (Phase 1).

## Decisions (5 Nov 2026)

1. Agents don't see join dates, probation end dates or the commission-exempt flag (moved to `agent_hr`).
2. Data Entry can view and add leads, but not edit them.
3. Every commission receipt line has an exchange rate, filled from the central rate and editable per line.
