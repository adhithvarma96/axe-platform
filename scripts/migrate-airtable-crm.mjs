#!/usr/bin/env node
// Airtable -> Supabase import, CRM tables (SPEC 14): leads (+ preferred areas/buildings, features wanted,
// gate ticks), viewings, closings, marketing leads. Run after scripts/migrate-airtable.mjs (which brings
// agents, owners, properties, external agents and referral partners, so the links resolve).
//
// Repeatable: rows upsert on airtable_id, link tables are rebuilt. Read-only on Airtable.
// Imported rows keep the state Airtable gave them (see migration 20261110000300_import_guards).
// Closings are then checked against Airtable's own commission formulas (SPEC 14.4).
//
//   node --env-file=.env.local scripts/migrate-airtable-crm.mjs            # dry run
//   node --env-file=.env.local scripts/migrate-airtable-crm.mjs --apply
// Refuses production unless --production is also passed.
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const APPLY = process.argv.includes("--apply");
const PROD_OK = process.argv.includes("--production");
const STAGING_REF = "dkxdeaardevnwcohrxdn", PROD_REF = "divuqbipkxdofkyrbfxh";
const env = (k) => { const v = process.env[k]; if (!v) throw new Error(`Missing ${k}`); return v; };
const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL");
if (APPLY && SUPABASE_URL.includes(PROD_REF) && !PROD_OK) throw new Error("Target is PRODUCTION. Pass --production to confirm.");
if (APPLY && !SUPABASE_URL.includes(STAGING_REF) && !SUPABASE_URL.includes(PROD_REF)) throw new Error("Unknown Supabase project.");

const AT = { pat: env("AIRTABLE_PAT"), base: env("AIRTABLE_BASE_ID") };
const T = { leads: "tbl8Ueoa2A9xYdttZ", viewings: "tblYhwwaTYPwUqzIP", closings: "tblBwyKHuIvzBlUc8", marketing: "tblGbebFZnY3I30At" };
const db = createClient(SUPABASE_URL, env("SUPABASE_SECRET_KEY"), { auth: { persistSession: false } });
const report = { target: SUPABASE_URL.includes(PROD_REF) ? "production" : "staging", mode: APPLY ? "apply" : "dry-run", tables: {}, problems: [], commission_check: [] };
const problem = (table, id, msg) => report.problems.push({ table, airtableId: id, msg });

async function fetchAll(tableId) {
  const out = []; let offset;
  do {
    const r = await fetch(`https://api.airtable.com/v0/${AT.base}/${tableId}?pageSize=100&returnFieldsByFieldId=true${offset ? `&offset=${offset}` : ""}`,
      { headers: { Authorization: `Bearer ${AT.pat}` } });
    if (!r.ok) throw new Error(`Airtable ${tableId}: HTTP ${r.status} ${await r.text()}`);
    const j = await r.json(); out.push(...j.records); offset = j.offset;
    await new Promise((res) => setTimeout(res, 220));
  } while (offset);
  return out;
}

const snake = (s) => String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const norm = (s) => String(s).toLowerCase().replace(/[–—-]/g, "-").replace(/\s+/g, " ").trim();
const one = (v) => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const txt = (v) => (v == null || String(v).trim() === "" ? null : String(v).trim());
const num = (v) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
const int = (v) => (num(v) == null ? null : Math.round(Number(v)));
const date = (v) => (v ? String(v).slice(0, 10) : null);
const cur = (v) => (v === "LKR" || v === "USD" ? v : null);
function pick(table, rid, field, value, map) {
  if (value == null || value === "") return null;
  const v = map[value] ?? map[norm(value)];
  if (!v) problem(table, rid, `${field}: unknown value "${value}"`);
  return v ?? null;
}
const SOURCING = { "Company-Direct": "company_direct", "Company-via-Referrer": "company_via_referrer", "Agent Self-Sourced": "agent_self_sourced", "Agent-via-Referrer": "agent_via_referrer" };
const STAGES = Object.fromEntries(["New", "Contacted", "Viewing Scheduled", "Viewing Completed", "Ongoing Negotiations", "Deposit Paid", "Documentation Ready", "Closed Won", "Lost", "Dormant"].map((s) => [s, snake(s)]));
const GATES = {
  fldO2nU8OQqkTTNpM: "gate1_offer_sent", fldqF5qCZ6sYiGkfG: "gate2_price_agreed", fldgbITXFuUTBrxYU: "gate2_payment_terms_agreed",
  fldAH9U1c7BPWRwXe: "gate2_flagged_items_addressed", fldBInUCJfHgLBLQr: "gate2_execution_date_agreed",
  fld5jFD6XFV56WAUn: "gate3_draft_agreement_shared", fldzvVt1ckA4nO3DJ: "gate3_agreed_to_proceed",
};

async function upsert(table, rows, key = "airtable_id") {
  report.tables[table] ??= { airtable: 0, written: 0, failed: 0 };
  report.tables[table].airtable += rows.length;
  if (!APPLY) return;
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const { error } = await db.from(table).upsert(batch, { onConflict: key });
    if (!error) { report.tables[table].written += batch.length; continue; }
    for (const row of batch) {
      const { error: e } = await db.from(table).upsert(row, { onConflict: key });
      if (e) { report.tables[table].failed++; problem(table, row.airtable_id, e.message); } else report.tables[table].written++;
    }
  }
}
async function idMap(table) {
  const map = new Map(); let from = 0;
  for (;;) {
    const { data, error } = await db.from(table).select("id, airtable_id").not("airtable_id", "is", null).range(from, from + 999);
    if (error) throw error;
    data.forEach((r) => map.set(r.airtable_id, r.id));
    if (data.length < 1000) break; from += 1000;
  }
  return map;
}
async function lookup(table, col = "name") {
  const { data, error } = await db.from(table).select(`id, ${col}`); if (error) throw error;
  return new Map(data.map((r) => [norm(r[col]), r.id]));
}
async function rebuild(table, parentCol, parentIds, rows) {
  report.tables[table] = { airtable: rows.length, written: 0, failed: 0 };
  if (!APPLY) return;
  for (let i = 0; i < parentIds.length; i += 300) {
    const { error } = await db.from(table).delete().in(parentCol, parentIds.slice(i, i + 300));
    if (error) throw new Error(`${table} delete: ${error.message}`);
  }
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from(table).insert(rows.slice(i, i + 500));
    if (error) { report.tables[table].failed += Math.min(500, rows.length - i); problem(table, "-", error.message); }
    else report.tables[table].written += Math.min(500, rows.length - i);
  }
}

console.log(`Airtable CRM -> ${report.target} (${report.mode})`);
const at = {};
for (const [k, id] of Object.entries(T)) { at[k] = await fetchAll(id); console.log(`  fetched ${k}: ${at[k].length}`); }

const ids = {
  agent: await idMap("agents"), owner: await idMap("owners"), property: await idMap("properties"),
  external: await idMap("external_agents"), partner: await idMap("referral_partners"),
  location: await idMap("locations"), development: await idMap("developments"),
};
const channels = await lookup("source_channels");
channels.set(norm("LPW"), channels.get(norm("LPW (Lanka Property Web)")));
const mktSources = await lookup("marketing_sources");
const features = await lookup("property_features");
const { data: countryRows } = await db.from("countries").select("code, name");
const countries = new Map(countryRows.map((c) => [norm(c.name), c.code]));
const COUNTRY_ALIAS = { phillippines: "PH", philippines: "PH", "united states": "US", usa: "US", uk: "GB", "united kingdom": "GB", "south korea": "KR", russia: "RU", vietnam: "VN", laos: "LA", "sri lanka": "LK", uae: "AE", "united arab emirates": "AE", "hong kong": "HK" };
const country = (rid, v) => {
  if (!v) return null;
  const c = countries.get(norm(v)) ?? COUNTRY_ALIAS[norm(v)];
  if (!c) problem("leads", rid, `nationality: no ISO match for "${v}"`);
  return c ?? null;
};
const link = (kind, table, rid, field, v) => {
  const a = one(v); if (!a) return null;
  const id = ids[kind].get(a); if (!id && APPLY) problem(table, rid, `${field}: linked record ${a} not imported`);
  return id ?? null;
};

// 1. Leads
const leadRows = at.leads.map((r) => {
  const f = r.fields, rid = r.id;
  let sourcing = pick("leads", rid, "sourcing_model", f.fld50ZUE6M2cLeGdp, SOURCING);
  const partner = link("partner", "leads", rid, "referral_partner", f.fldeKxNw557sWPuvF);
  if (sourcing?.includes("referrer") && !partner) { problem("leads", rid, `sourcing "${f.fld50ZUE6M2cLeGdp}" without a referral partner: sourcing left blank`); sourcing = null; }
  const channel = f.fldYLKMBdOaQD67uq ? channels.get(norm(f.fldYLKMBdOaQD67uq)) : null;
  if (f.fldYLKMBdOaQD67uq && !channel) problem("leads", rid, `source channel "${f.fldYLKMBdOaQD67uq}" not in the list`);
  return {
    airtable_id: rid,
    name: txt(f.flds16IY8LXBgg0Wj) ?? "(no name)",
    lead_code: txt(f.flde2lNZL0DKhc5qK), seq_no: int(f.fldwvpWDFBEw9k577),
    profile: pick("leads", rid, "profile", f.fldoRvIm9OaCNjZL7, { Expat: "expat", Diplomatic: "diplomatic", Corporate: "corporate", Local: "local" }),
    nationality_code: country(rid, f.fldeeJX9kEfY5atnT),
    phone: txt(f.fldAnJI0gIswMBjEN), email: txt(f.fldhCixltWFd275QT)?.toLowerCase() ?? null, company: txt(f.fld7oeCUShft5Ff98),
    lead_source_type: pick("leads", rid, "lead_source_type", f.fldRTvZ9Ub5xj90zX, { Direct: "direct", "Via Agent": "via_agent" }),
    source_channel_id: channel ?? null,
    referring_external_agent_id: link("external", "leads", rid, "referring agent", f.fldZctIosdvSGd8qt),
    looking_for: pick("leads", rid, "looking_for", f.fldaXySz6Xhctt6fS, { Rent: "rent", Buy: "buy", Either: "either" }),
    property_types_wanted: (f.fldcggiBDNwj3ixJW ?? []).map(snake),
    bedrooms: int(f.fld0oJmV5xhfk768A), occupants: int(f.fldaORdAtVFf6A15v),
    budget_min: num(f.fldFu1KD3Eh7Y81oR), budget_max: num(f.fldlBznBXdycvxlC0), budget_currency: cur(f.fldYdLC9Qo8z7c04a),
    move_in_date: date(f.fldyjliDGvtrCQFjE),
    purchase_timeline: pick("leads", rid, "purchase_timeline", f.fldqhitzbarSpPWFa, { Immediate: "immediate", "1-3 Months": "months_1_3", "3-6 Months": "months_3_6", "6+ Months": "months_6_plus" }),
    financing: pick("leads", rid, "financing", f.fldLRu4PEixIMU5uf, { Cash: "cash", "Bank Loan": "bank_loan", "Part Cash / Part Loan": "part_cash_part_loan" }),
    pipeline_status: pick("leads", rid, "pipeline_status", f.fldIgeUkMUzFpDaQV, STAGES) ?? "new",
    urgency: pick("leads", rid, "urgency", f.fldFk7EGXnO4vAtZJ, { Low: "low", Medium: "medium", High: "high", Immediate: "immediate" }),
    assigned_agent_id: link("agent", "leads", rid, "assigned agent", f.fldDwJZnDjm3ORFmq),
    last_contacted: date(f.fld15ZVqq65CkzwPn),
    detailed_requirements: txt(f.fldP0z9MDsQi3UeJu), internal_notes: txt(f.fldQ93oyBZ207ZObQ),
    linked_owner_id: link("owner", "leads", rid, "linked owner", f.fld7q0OaNoDQPPz2f),
    sourcing_model: sourcing, referral_partner_id: partner,
    created_at: f.fldfXOZPwvQUdV9NO ?? undefined,
  };
});
// one lead code each (Airtable formula duplicates would break the unique key)
const seen = new Set();
for (const l of leadRows) { if (l.lead_code && seen.has(l.lead_code)) { problem("leads", l.airtable_id, `duplicate Lead ID ${l.lead_code}: new code assigned`); l.lead_code = null; l.seq_no = null; } else if (l.lead_code) seen.add(l.lead_code); }
await upsert("leads", leadRows);
ids.lead = APPLY ? await idMap("leads") : new Map();

const leadIds = at.leads.map((r) => ids.lead.get(r.id)).filter(Boolean);
const linksOf = (field, kind, col) => at.leads.flatMap((r) => (r.fields[field] ?? []).map((x) => ({ lead_id: ids.lead.get(r.id), [col]: ids[kind].get(x) })).filter((x) => x.lead_id && x[col]));
await rebuild("lead_preferred_locations", "lead_id", leadIds, linksOf("fld4Tg2ykxjcX62e9", "location", "location_id"));
await rebuild("lead_preferred_developments", "lead_id", leadIds, linksOf("fldBnT06bL74gq4Jp", "development", "development_id"));
await rebuild("lead_features_wanted", "lead_id", leadIds, at.leads.flatMap((r) => (r.fields.fldJ6pahK8G9pZt9d ?? []).map((x) => ({ lead_id: ids.lead.get(r.id), feature_id: features.get(norm(x)) })).filter((x) => x.lead_id && x.feature_id)));
// gate ticks: add what Airtable has ticked (ticks are sticky, never removed here)
const ticks = at.leads.flatMap((r) => Object.entries(GATES).filter(([fid]) => r.fields[fid] === true).map(([, key]) => ({ lead_id: ids.lead.get(r.id), gate_item_key: key }))).filter((t) => t.lead_id);
report.tables.lead_gate_ticks = { airtable: ticks.length, written: 0 };
if (APPLY && ticks.length) {
  const { error } = await db.from("lead_gate_ticks").upsert(ticks, { onConflict: "lead_id,gate_item_key", ignoreDuplicates: true });
  if (error) problem("lead_gate_ticks", "-", error.message); else report.tables.lead_gate_ticks.written = ticks.length;
}

// 2. Viewings
const MODELS = { "Our Lead + Our Property": "our_lead_our_property", "Our Lead + Co-broke Property": "our_lead_cobroke_property", "Co-broke Lead + Our Property": "cobroke_lead_our_property", "Co-broke Lead + Co-broke Property": "cobroke_lead_cobroke_property", "Sourcing Visit": "sourcing_visit" };
const toTime = (s) => {
  const m = String(s ?? "").trim().match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  let h = Number(m[1]); const min = Number(m[2] ?? 0); const ap = m[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12; if (ap === "am" && h === 12) h = 0;
  return h < 24 && min < 60 ? `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}` : null;
};
await upsert("viewings", at.viewings.filter((r) => {
  if (!r.fields.fldfOfCDSM1XF03lp) { problem("viewings", r.id, "no date: skipped"); return false; } return true;
}).map((r) => {
  const f = r.fields, rid = r.id;
  return {
    airtable_id: rid, viewing_no: int(f.fld3Dr5jLGRskaR8k), date: date(f.fldfOfCDSM1XF03lp),
    time: toTime(f.fldq8u4z44ZNhsfg0), time_text_legacy: txt(f.fldq8u4z44ZNhsfg0),
    lead_id: link("lead", "viewings", rid, "lead", f.fldZKoWfO34KuLXzI),
    property_id: link("property", "viewings", rid, "property", f.fldEG9OONjceR8ibf),
    outcome: pick("viewings", rid, "outcome", f.fldoHVu9fQYkvv0sc, { Pending: "pending", Interested: "interested", "Not Interested": "not_interested", "Wants Second Viewing": "wants_second_viewing", "Made Offer": "made_offer" }) ?? "pending",
    conducted_by_agent_id: link("agent", "viewings", rid, "conducted by", f.fldhQkLMsjnQmvGh4),
    viewing_model: pick("viewings", rid, "viewing_model", f.fld9Ark9nCcD4M8wj, MODELS),
    co_broke_external_agent_id: link("external", "viewings", rid, "co-broke agent", f.fldSG177UiFcRcLSq),
    landlord_present: f.fldiwlSq6Jn7lUWVc === true, feedback_notes: txt(f.fld2t1kPdXBpSBIgo),
    last_follow_up: date(f.fldDsXV33awcgwHUk), created_at: f.fld4KEzjUquZaLJaJ ?? undefined,
  };
}));

// 3. Closings
const closingRows = at.closings.filter((r) => {
  if (!r.fields.fld37GPyfRmeHzhnu || !r.fields.fldRwL11U2V22QewG) { problem("closings", r.id, "no closing date or deal type: skipped"); return false; } return true;
}).map((r) => {
  const f = r.fields, rid = r.id;
  return {
    airtable_id: rid, closing_no: int(f.flduhEKoDadcScqMG), closing_date: date(f.fld37GPyfRmeHzhnu),
    deal_type: pick("closings", rid, "deal_type", f.fldRwL11U2V22QewG, { Rental: "rental", "Short-let": "short_let", Sale: "sale" }),
    lead_id: link("lead", "closings", rid, "lead", f.fldJhpm3A4TU78tcP), property_id: link("property", "closings", rid, "property", f.fldR9PRWHaiiMbVYt),
    closing_agent_id: link("agent", "closings", rid, "closing agent", f.fldO75Lw3xtX5vMFg),
    lead_side_agent_id: link("agent", "closings", rid, "lead-side agent", f.fldWBUqZFtdpqfsj6),
    listing_side_agent_id: link("agent", "closings", rid, "listing-side agent", f.fldyGW9aq5lTlvHb9),
    monthly_rent: num(f.fldbXbbdXL4IPKjVU), total_deal_value: num(f.fldk2nfWwEUdShSha), deal_currency: cur(f.fldBwkTJjzLJTuq1f),
    usd_lkr_rate: num(f.flduly8yMkxSibzeI),
    lease_start_date: date(f.fldEOmyYg6uTo4Uyg), lease_end_date: date(f.fldQvhfUsWDc7bnD5),
    rent_advance_months: num(f.fldzExhN7gAH6tHvd), security_deposit_months: num(f.fldSI8iCIBVBOx59G),
    our_commission: num(f.fldFG2DEZrtVs0vth), commission_currency: cur(f.fldnKDLs0f3tvUqGH),
    payment_method_legacy: pick("closings", rid, "payment_method", f.fld7v9kRuEzRBoBP8, { "Bank Transfer": "bank_transfer", Cash: "cash" }),
    co_broke_external_agent_id: link("external", "closings", rid, "co-broke agent", f.fldhzjn0UzFnFlWpk),
    co_broke_split_pct: num(f.fldH2PPlLXiLCUetO),
    lead_side_referral_partner_id: link("partner", "closings", rid, "lead-side referrer", f.fldQMxXIAKxURRIm2),
    listing_side_referral_partner_id: link("partner", "closings", rid, "listing-side referrer", f.fldGggHLl3RbveF0e),
    lead_side_paid_to_referrer: num(f.fldsryQGOZe8Zyjsq), listing_side_paid_to_referrer: num(f.fldZEQ7P3jZSjbcHk),
    // snapshot the sourcing models exactly as Airtable saw them
    lead_sourcing_model: f.fldrJ4eaySfOihTcG ? pick("closings", rid, "lead sourcing", one(f.fldrJ4eaySfOihTcG), SOURCING) : null,
    listing_sourcing_model: f.fldMMpDwyKryk6h2O ? pick("closings", rid, "listing sourcing", one(f.fldMMpDwyKryk6h2O), SOURCING) : null,
    notes: txt(f.fld3S45pTuBkHeE7A), created_at: f.fld3qXBpJL1taGy5d ?? undefined,
    _airtable: { agent: num(f.fldn4qefHAUMMt2ZU), referrer: num(f.fldWvh8Sva8aYHoxn), axe: num(f.fldaoWULMAfCdD6BS), check: txt(f.fldhFbHCrRMdWC0sh) },
  };
});
await upsert("closings", closingRows.map(({ _airtable, ...c }) => c));

// SPEC 14.4: does the new engine pay what Airtable paid?
if (APPLY) {
  const { data } = await db.from("closings").select("airtable_id, closing_no, closing_date, agent_total, referrer_total, axe_total, split_delta").not("airtable_id", "is", null);
  const byId = new Map(data.map((c) => [c.airtable_id, c]));
  for (const c of closingRows) {
    const ours = byId.get(c.airtable_id); if (!ours) continue;
    const a = c._airtable, d = (x, y) => Math.abs(Number(x ?? 0) - Number(y ?? 0));
    const ok = d(ours.agent_total, a.agent) <= 1 && d(ours.referrer_total, a.referrer) <= 1 && d(ours.axe_total, a.axe) <= 1;
    report.commission_check.push({ closing_no: c.closing_no, date: c.closing_date, match: ok, airtable: a, engine: { agent: Number(ours.agent_total), referrer: Number(ours.referrer_total), axe: Number(ours.axe_total), delta: Number(ours.split_delta) } });
  }
}

// 4. Marketing leads (email is the dedupe key, case-insensitive; the latest submission wins)
const AUD = { Owner: "owner", "Buyer / Investor": "buyer_investor", Tenant: "tenant" };
const byEmail = new Map();
for (const r of at.marketing) {
  const f = r.fields, rid = r.id, email = txt(f.fldaTMqUOipVObG3d)?.toLowerCase();
  if (!email) { problem("marketing_leads", rid, "no email: skipped"); continue; }
  const row = {
    airtable_id: rid, name: txt(f.fldDpSgOZNXsp1fnO), email, whatsapp: txt(f.fldrQPpeqmlPG0V8w),
    audience_type: pick("marketing_leads", rid, "audience", f.fldAPbtD7UX1EUxR4, AUD),
    development_or_area: txt(f.fldqBI3q1KXY8lfnh),
    source_id: f.fldc3oNAiVogbLaTP ? mktSources.get(norm(f.fldc3oNAiVogbLaTP)) ?? null : null,
    status: pick("marketing_leads", rid, "status", f.fld8lxszxn4IcneO6, Object.fromEntries(["New", "Nurturing", "Engaged", "Promoted", "Unsubscribed", "Disqualified"].map((s) => [s, snake(s)]))) ?? "new",
    marketing_opt_in: f.flddnsPDzAWPu47Ib === true, submitted_at: f.fldmRLn9Y77f51byz ?? f.fldSQ9PZNe5FSelNd ?? null,
    promoted_to_owner_id: link("owner", "marketing_leads", rid, "promoted owner", f.fldgHhedmG7bqwwBy),
    promoted_to_lead_id: link("lead", "marketing_leads", rid, "promoted lead", f.fldQANNC1qwjL5p97),
    promoted_to_external_agent_id: link("external", "marketing_leads", rid, "promoted agent", f.flda6KIvUIBKM92OG),
    promoted_to_referral_partner_id: link("partner", "marketing_leads", rid, "promoted partner", f.fldjJN1nPoBfI1zj3),
    notes: txt(f.fldHSFnMqBLj4stuY), created_at: f.fldSQ9PZNe5FSelNd ?? undefined,
  };
  const prev = byEmail.get(email);
  if (prev) problem("marketing_leads", rid, `duplicate email ${email}: kept the latest submission`);
  if (!prev || String(row.submitted_at) > String(prev.submitted_at)) byEmail.set(email, row);
}
await upsert("marketing_leads", [...byEmail.values()]);

if (APPLY) { const { error } = await db.rpc("admin_sync_sequences"); if (error) problem("-", "-", `sync sequences: ${error.message}`); }

// Report
fs.mkdirSync("migration-reports", { recursive: true });
const file = `migration-reports/crm-${report.target}-${new Date().toISOString().slice(0, 19).replace(/:/g, "")}.json`;
fs.writeFileSync(file, JSON.stringify(report, null, 2));
console.log("\nTables:"); for (const [t, s] of Object.entries(report.tables)) console.log(`  ${t.padEnd(30)} ${JSON.stringify(s)}`);
const cc = report.commission_check;
if (cc.length) console.log(`\nCommission check: ${cc.filter((c) => c.match).length}/${cc.length} closings match Airtable's payouts`);
const byKind = {}; for (const p of report.problems) { const k = `${p.table}: ${p.msg.replace(/\S+@\S+/g, "[email]").replace(/rec\w{14}|"[^"]*"|\d[\d,.]*/g, "…")}`; byKind[k] = (byKind[k] ?? 0) + 1; }
console.log(`\nProblems (${report.problems.length}):`); for (const [k, n] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)} × ${k}`);
console.log(`\nReport: ${file}`);
