#!/usr/bin/env node
// Airtable -> Supabase import (SPEC section 14). Phase 1 tables:
// locations, developments (+towers), agents, external agents, referral partners,
// owners, properties (+feature links, source agents).
//
// Repeatable: every row is upserted on `airtable_id`, link tables are rebuilt.
// Read-only on Airtable. Writes with the service key (bypasses RLS).
//
//   node --env-file=.env.local scripts/migrate-airtable.mjs            # dry run: fetch, map, report
//   node --env-file=.env.local scripts/migrate-airtable.mjs --apply    # write to the project in the env file
//
// Refuses to write to production unless --production is also passed.

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const APPLY = process.argv.includes("--apply");
const PROD_OK = process.argv.includes("--production");
const STAGING_REF = "dkxdeaardevnwcohrxdn";
const PROD_REF = "divuqbipkxdofkyrbfxh";

const env = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing ${k}`);
  return v;
};
const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL");
if (APPLY && SUPABASE_URL.includes(PROD_REF) && !PROD_OK) throw new Error("Target is PRODUCTION. Pass --production to confirm.");
if (APPLY && !SUPABASE_URL.includes(STAGING_REF) && !SUPABASE_URL.includes(PROD_REF)) throw new Error("Unknown Supabase project.");

const AT = { pat: env("AIRTABLE_PAT"), base: env("AIRTABLE_BASE_ID") };
const T = {
  locations: "tblOPlgBpGO04X3zH", developments: "tblkbu3hPMBWq5d7c", agents: "tbliNkywwlEJUHJbG",
  externalAgents: "tblqATGSsugpkIhD0", referralPartners: "tblugDfDea405CmNY", owners: "tblWfuln38K9VKeTH",
  properties: "tblgbFQ6w5tNhruNO",
};

const db = createClient(SUPABASE_URL, env("SUPABASE_SECRET_KEY"), { auth: { persistSession: false } });
const report = { target: SUPABASE_URL.includes(PROD_REF) ? "production" : "staging", mode: APPLY ? "apply" : "dry-run", tables: {}, problems: [] };
const problem = (table, airtableId, msg) => report.problems.push({ table, airtableId, msg });

// ---------------------------------------------------------------------------
// Airtable
// ---------------------------------------------------------------------------
async function fetchAll(tableId) {
  const out = [];
  let offset;
  do {
    const url = `https://api.airtable.com/v0/${AT.base}/${tableId}?pageSize=100&returnFieldsByFieldId=true${offset ? `&offset=${offset}` : ""}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${AT.pat}` } });
    if (!r.ok) throw new Error(`Airtable ${tableId}: HTTP ${r.status} ${await r.text()}`);
    const j = await r.json();
    out.push(...j.records);
    offset = j.offset;
    await new Promise((res) => setTimeout(res, 220)); // stay under 5 requests/second
  } while (offset);
  return out;
}

// ---------------------------------------------------------------------------
// Value helpers
// ---------------------------------------------------------------------------
const snake = (s) => String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const norm = (s) => String(s).toLowerCase().replace(/[–—-]/g, "-").replace(/\s+/g, " ").trim();
const one = (v) => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const txt = (v) => (v == null || String(v).trim() === "" ? null : String(v).trim());
const num = (v) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
const int = (v) => (num(v) == null ? null : Math.round(Number(v)));
const bool = (v) => v === true;
const date = (v) => (v ? String(v).slice(0, 10) : null);

function enumOf(table, rid, field, value, allowed, overrides = {}) {
  if (value == null || value === "") return null;
  const v = overrides[value] ?? snake(value);
  if (!allowed.includes(v)) { problem(table, rid, `${field}: unknown value "${value}"`); return null; }
  return v;
}
const ENUM = {
  property_type: ["apartment", "house", "land", "villa", "commercial"],
  property_status: ["available", "reserved", "rented", "sold", "withdrawn"],
  listing_type: ["rent_long_term", "rent_short_term", "sale"],
  condition: ["brand_new", "off_plan", "under_construction", "used"],
  furnishing: ["fully", "semi", "unfurnished", "unknown"],
  currency: ["LKR", "USD"],
  source_type: ["direct", "via_agent"],
  sourcing_model: ["company_direct", "company_via_referrer", "agent_self_sourced", "agent_via_referrer"],
  owner_type: ["individual", "corporate", "developer", "bank", "unknown_via_agent"],
  contact_protocol: ["direct_call_ok", "introduce_via_whatsapp_first", "route_through_adhith"],
  investor_type: ["first_time_buyer", "casual_investor", "serial_investor", "end_user", "developer", "not_applicable"],
  looking_for: ["rent", "buy", "either"],
  development_status: ["completed", "under_construction", "off_plan", "pre_launch"],
  referral_attribution: ["company_referrer", "agent_personal_referrer"],
  agent_role: ["super_admin", "sales_manager", "agent", "data_entry"],
  agent_status: ["active", "inactive"],
  water_source: ["mains", "well", "tube_well", "both"],
  land_shape: ["square", "rectangular", "irregular"],
  land_category: ["residential", "commercial", "mixed", "agricultural", "beachfront"],
  title_type: ["freehold", "leasehold", "crown_grant"],
  pool_size: ["small", "medium", "large"],
  commercial_sub_category: ["office", "retail", "warehouse"],
  building_grade: ["a", "b", "c"],
  air_conditioning: ["central", "split", "none"],
  floor_sharing: ["shared_floor", "dedicated_floor"],
  storefront_type: ["glass", "solid", "mixed"],
  traffic_level: ["high", "medium", "low"],
};
const cur = (table, rid, field, v) => (v == null ? null : ENUM.currency.includes(v) ? v : (problem(table, rid, `${field}: "${v}"`), null));

// ---------------------------------------------------------------------------
// Supabase writes
// ---------------------------------------------------------------------------
async function upsert(table, rows, key = "airtable_id") {
  report.tables[table] = { airtable: rows.length, written: 0, failed: 0 };
  if (!APPLY) return;
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const { error } = await db.from(table).upsert(batch, { onConflict: key });
    if (!error) { report.tables[table].written += batch.length; continue; }
    // retry row by row so one bad row doesn't sink the batch
    for (const row of batch) {
      const { error: e } = await db.from(table).upsert(row, { onConflict: key });
      if (e) { report.tables[table].failed++; problem(table, row.airtable_id, e.message); }
      else report.tables[table].written++;
    }
  }
}
async function idMap(table) {
  const map = new Map();
  if (!APPLY) return map;
  let from = 0;
  for (;;) {
    const { data, error } = await db.from(table).select("id, airtable_id").not("airtable_id", "is", null).range(from, from + 999);
    if (error) throw error;
    data.forEach((r) => map.set(r.airtable_id, r.id));
    if (data.length < 1000) break;
    from += 1000;
  }
  return map;
}
async function lookup(table) {
  const { data, error } = await db.from(table).select("id, name");
  if (error) throw error;
  const m = new Map();
  data.forEach((r) => m.set(norm(r.name), r.id));
  return m;
}
async function rebuildLinks(table, parentCol, parentIds, rows) {
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

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
console.log(`Airtable -> ${report.target} (${report.mode})`);
const at = {};
for (const [k, id] of Object.entries(T)) { at[k] = await fetchAll(id); console.log(`  fetched ${k}: ${at[k].length}`); }

const provinces = await lookup("provinces");
const ownerSources = await lookup("owner_sources");
const referrerCats = await lookup("referrer_categories");
const sourceChannels = await lookup("source_channels");
const features = await lookup("property_features");

// 1. Locations
await upsert("locations", at.locations.map((r) => {
  const f = r.fields;
  return {
    airtable_id: r.id, name: txt(f.fldbeZ5lFl6jzKwEM) ?? `Location ${r.id}`,
    province_id: f.fldViM9NWpvKh7hyz ? provinces.get(norm(f.fldViM9NWpvKh7hyz)) ?? null : null,
    postal_code: txt(f.fldFOWTc289kvlR2q), notes: txt(f.fldKAJGZnYyMqbzHq),
    market_tier: /colombo 0?2\b/i.test(f.fldbeZ5lFl6jzKwEM ?? "") ? "prime_core" : "outside_core",
    created_at: r.createdTime,
  };
}));
const locId = await idMap("locations");

// 2. Developments
await upsert("developments", at.developments.map((r) => {
  const f = r.fields;
  return {
    airtable_id: r.id, name: txt(f.fldsx9EK5BEizAx9s) ?? `Development ${r.id}`,
    location_id: locId.get(one(f.fld0MGECX7j9Fdy1c)) ?? null,
    developer_builder: txt(f.fldemmkh6ICuZl0ap), year_completed: int(f.fldwWLd31HrItjKel), total_units: int(f.fldPLb0WekW7tiGDx),
    towers_blocks: txt(f.fld9jhZ2FhcnEbe4R), notes: txt(f.fldd95WLyMNVeeFeg),
    development_status: enumOf("developments", r.id, "status", f.fldn0BcfgvBIw4Ink, ENUM.development_status),
    created_at: r.createdTime,
  };
}));
const devId = await idMap("developments");

// 3. Internal agents (+ HR details). Existing logins are matched by work email or name.
const existingAgents = APPLY ? (await db.from("agents").select("id, full_name, work_email, airtable_id")).data : [];
const agentRows = at.agents.map((r) => {
  const f = r.fields;
  const name = txt(f.fldAOlKFqphOifIMO) ?? `Agent ${r.id}`;
  const email = txt(f.fldNra3jH38lZnHwX);
  const match = existingAgents.find((a) => a.airtable_id === r.id)
    ?? existingAgents.find((a) => !a.airtable_id && ((email && a.work_email?.toLowerCase() === email.toLowerCase()) || a.full_name.toLowerCase() === name.toLowerCase()));
  return {
    ...(match ? { id: match.id } : {}),
    airtable_id: r.id, full_name: name,
    role: enumOf("agents", r.id, "role", f.fldW6BuT5yNx7ZdoM, ENUM.agent_role) ?? "agent",
    status: enumOf("agents", r.id, "status", f.fldpKX5IeN1Ms8lPv, ENUM.agent_status) ?? "active",
    work_email: email ?? match?.work_email ?? null,
    created_at: r.createdTime,
    _hr: {
      date_joined: date(f.fldwHGw0hxLCzJYsh), probation_end_date: date(f.fldEVSAKqmd3QZRnr),
      commission_exempt: bool(f.fld5rayZZ3ROxzlxy), personal_email: txt(f.fldwZ7fUSRtSjLlwc),
      personal_phone: txt(f.fldzSQCd0ZjY12wZF), personal_address: txt(f.fldo9S2zitpxCROVF),
      document_links: txt(f.fld84UR5OYYQnQTl4), notes: txt(f.fldke1S3jCVaT1TPg),
    },
  };
});
// rows matched to an existing login update by id, the rest upsert by airtable_id
report.tables.agents = { airtable: agentRows.length, written: 0, failed: 0 };
if (APPLY) {
  for (const { _hr, ...row } of agentRows) {
    const q = row.id ? db.from("agents").update(row).eq("id", row.id) : db.from("agents").upsert(row, { onConflict: "airtable_id" });
    const { error } = await q;
    if (error) { report.tables.agents.failed++; problem("agents", row.airtable_id, error.message); } else report.tables.agents.written++;
  }
}
const agentId = await idMap("agents");
await upsert("agent_hr", agentRows.filter((a) => agentId.has(a.airtable_id) || !APPLY).map((a) => ({ agent_id: agentId.get(a.airtable_id) ?? a.airtable_id, ...a._hr })), "agent_id");

// 4. External agents
await upsert("external_agents", at.externalAgents.map((r) => {
  const f = r.fields;
  return {
    airtable_id: r.id, agent_name: txt(f.flducAfUPOBJoJp9k) ?? `External agent ${r.id}`, company: txt(f.fldeoI9MEr0nxHydv),
    phone: txt(f.fldFDigK7CXLvLTzE), whatsapp: txt(f.fld8Xr9FqqOQRkk04), email: txt(f.fld5VDwIBEMMz1Qvp),
    areas_covered_text: txt(f.fldRyu4MahSuf3vL5), reliability: int(f.fldWpYR8rcGRDJuJV) || null,
    notes: txt(f.fldJQtwaUCzNGp5z7), created_at: r.createdTime,
  };
}));
const extId = await idMap("external_agents");

// 5. Referral partners
await upsert("referral_partners", at.referralPartners.map((r) => {
  const f = r.fields;
  return {
    airtable_id: r.id, full_name: txt(f.fldxnZoQY0azLe12O) ?? `Referrer ${r.id}`, phone: txt(f.fld9M0wZ5Dhe6Tlb3),
    email: txt(f.fldFnQxtx94U7bJom), company_organization: txt(f.fldn4qRFITePOH9Fm),
    referrer_category_id: f.fldaBG78Lzv2F6SXT ? referrerCats.get(norm(f.fldaBG78Lzv2F6SXT)) ?? null : null,
    attribution: enumOf("referral_partners", r.id, "attribution", f.fldaf5z4hIMy9PFLO, ENUM.referral_attribution, { "Agent - Personal Referrer": "agent_personal_referrer" }),
    attributed_to_agent_id: agentId.get(one(f.fldAL4vtbNH3Zvu53)) ?? null,
    notes: txt(f.fldHgQGrm6aNcZmkg), registered_at: f.fldZhEgdtQQ9EI15f ?? r.createdTime, created_at: r.createdTime,
  };
}));
const refId = await idMap("referral_partners");

// 6. Owners
await upsert("owners", at.owners.map((r) => {
  const f = r.fields;
  return {
    airtable_id: r.id, name: txt(f.fldxQwhIWBeic8HCQ) ?? `Owner ${r.id}`,
    owner_type: enumOf("owners", r.id, "owner type", f.fldOL7jLLbKPNilQP, ENUM.owner_type),
    primary_phone: txt(f.fld3s3Fxl9HkLETkJ), whatsapp: txt(f.fld8kiu10KX5RhUrN), email: txt(f.fldfLjg00JkmVUDUN),
    address: txt(f.fld3pXIwcpwCxJpC1), notes: txt(f.fldStC7oMie5y8zE2),
    contact_protocol: enumOf("owners", r.id, "contact protocol", f.fldwWU9u4j4IoE49W, ENUM.contact_protocol),
    owner_source_id: f.fldaksM94OhmZAo3e ? ownerSources.get(norm(f.fldaksM94OhmZAo3e)) ?? null : null,
    sourced_by_agent_id: agentId.get(one(f.fldAFpfn7zc2XaTyz)) ?? null,
    open_to_buying: bool(f.fld9o8YZYvyvF4z17),
    investor_type: enumOf("owners", r.id, "investor type", f.fld6W3bDKfNbITYW6, ENUM.investor_type),
    buying_looking_for: enumOf("owners", r.id, "buying looking for", f.fldnhIwHRqnKy6JM0, ENUM.looking_for),
    buying_property_types: (f.fldlsRsE1F5uOO8Qt ?? []).map((v) => enumOf("owners", r.id, "buying types", v, ENUM.property_type)).filter(Boolean),
    buying_budget_min: num(f.fldlYGBlMO935Ozic), buying_budget_max: num(f.fldzVKCcr5JPVnmb1),
    buying_budget_currency: cur("owners", r.id, "budget currency", f.fldV9k9PIwsahaNOe),
    buying_notes: txt(f.fldfGmqS0f88unqCs), created_at: r.createdTime,
  };
}));
const ownerId = await idMap("owners");
const ownerIds = [...ownerId.values()];
await rebuildLinks("owner_source_external_agents", "owner_id", ownerIds, at.owners.flatMap((r) =>
  (r.fields.fldddjT3NYcBMajwZ ?? []).filter((x) => extId.has(x) && ownerId.has(r.id)).map((x) => ({ owner_id: ownerId.get(r.id), external_agent_id: extId.get(x) }))));
await rebuildLinks("owner_buying_locations", "owner_id", ownerIds, at.owners.flatMap((r) =>
  (r.fields.fldVX7vkDpZh8XSZb ?? []).filter((x) => locId.has(x) && ownerId.has(r.id)).map((x) => ({ owner_id: ownerId.get(r.id), location_id: locId.get(x) }))));

// 7. Towers: Airtable has one global list; attach each tower to the development it is used in.
const towerPairs = new Map();
for (const r of at.properties) {
  const t = txt(r.fields.fldc0ckXrxnqCRyiE), d = devId.get(one(r.fields.fld4nAWZYkfsJdMJd));
  if (t && d) towerPairs.set(`${d}|${t}`, { development_id: d, name: t });
}
report.tables.development_towers = { airtable: towerPairs.size, written: 0, failed: 0 };
if (APPLY && towerPairs.size) {
  const { error } = await db.from("development_towers").upsert([...towerPairs.values()], { onConflict: "development_id,name" });
  if (error) problem("development_towers", "-", error.message); else report.tables.development_towers.written = towerPairs.size;
}
const towerId = new Map();
if (APPLY) ((await db.from("development_towers").select("id, development_id, name")).data ?? []).forEach((t) => towerId.set(`${t.development_id}|${t.name}`, t.id));

// 8. Properties
const P = "properties";
const listingNos = new Map();
const propRows = at.properties.map((r) => {
  const f = r.fields;
  const dev = devId.get(one(f.fld4nAWZYkfsJdMJd)) ?? null;
  const tower = txt(f.fldc0ckXrxnqCRyiE);
  const listingNo = txt(f.fldAn76ccGT8TVCo1);
  if (!listingNo) problem(P, r.id, "no Listing No");
  else if (listingNos.has(listingNo)) problem(P, r.id, `duplicate Listing No ${listingNo} (also ${listingNos.get(listingNo)})`);
  else listingNos.set(listingNo, r.id);
  const sourcing = enumOf(P, r.id, "sourcing model", f.fldKnDdfruxDFfRz4, ENUM.sourcing_model);
  return {
    airtable_id: r.id, listing_no: listingNo, seq_no: int(f.fldx3sdKLpiu9Qf2Q),
    property_type: enumOf(P, r.id, "type", f.fld0rav8Dm4fRonS1, ENUM.property_type) ?? "apartment",
    status: enumOf(P, r.id, "status", f.fldeyXC96pgiTuZhL, ENUM.property_status) ?? "available",
    listing_types: (f.fldZnFZeqHu7gF1zo ?? []).map((v) => enumOf(P, r.id, "listing types", v, ENUM.listing_type)).filter(Boolean),
    condition: enumOf(P, r.id, "condition", f.fld7159ffLaFLFWv3, ENUM.condition),
    expected_completion_date: date(f.fld5rpy4NnVzhrWZz), listing_date: date(f.fldZ7BoRmn6IRwHSh),
    location_id: locId.get(one(f.fldD3qo9G6U57D8GC)) ?? null, development_id: dev,
    tower_id: dev && tower ? towerId.get(`${dev}|${tower}`) ?? null : null, tower_name_legacy: tower,
    unit_number: txt(f.fld4b174NBjFqx1g3), floor: txt(f.fldz1JboHg9DWCe4T), building_name: txt(f.fldPUGno92YUGM2li),
    // 123 LOLC units bulk-created 24-25 Sep 2026 (SPEC 17): excluded from "properties sourced"
    is_bulk_import: /^2026-09-2[45]/.test(r.createdTime),
    square_feet: num(f.fldEXHjppiHvmsVIl), beds: int(f.fldgPApqaDvvRWYXL), baths: int(f.fldhwdcQb7gJk3sYp), parking: int(f.fldRYpGdF5RpLSEyt),
    furnished: enumOf(P, r.id, "furnished", f.fldv6vgf4KjKD8rOJ, ENUM.furnishing),
    maids_room: bool(f.fldINAO3LqEtSY4rf), maids_bath: bool(f.fld3X2nJdHk7TDkBy),
    asking_rent: num(f.flduiknQfpDN2Umtu), rent_currency: cur(P, r.id, "rent currency", f.fldSiR9dTe90vEFxO),
    asking_sale_price: num(f.fld5BOsZl0ycO1LBI), sale_currency: cur(P, r.id, "sale currency", f.fldS0Y1Bk8P8Yj87D),
    available_from: date(f.fldv5nUukYVQlyRHZ), next_available_date: date(f.fld0gpQRe5ecn8vsa),
    last_made_available: date(f.fldM9L3UXogOvN0SD), last_verified: date(f.fldyJslPLgTdYlbmf),
    owner_id: ownerId.get(one(f.fld0AR6dln5Kvrm4z)) ?? null,
    source_channel_id: f.fld7g8OSfR0IpYPQO ? sourceChannels.get(norm(f.fld7g8OSfR0IpYPQO)) ?? null : null,
    listing_source_type: enumOf(P, r.id, "listing source type", f.fldxa8qEQeN9xwmVt, ENUM.source_type, { "Direct From Owner": "direct" }),
    listing_agent_id: agentId.get(one(f.fldedmzr3Dkg8unzQ)) ?? null,
    sourcing_model: sourcing, referral_partner_id: refId.get(one(f.fldfdCQn0vYpAdgjI)) ?? null,
    commission_structure: txt(f.fldBrb6nk8tafvW5x),
    public_notes: txt(f.fldwkNGMiegilA1TN), internal_notes: txt(f.fldHbXCuVZaAyFOWk),
    map_pin: txt(f.fldMTCnB076m4OqDF), photos_link: txt(f.fldPhaSG0GqVspT2N), customer_photo_link: txt(f.fldfFcAu2IqeJiDMD),
    website_published: bool(f.fldwloDDx4U4sG5Zx), lanka_property_web_posted: bool(f.fld8b2Hj2QByVBaNn),
    ikman_posted: bool(f.fldgmuoEqKo9RZZF7), realtor_wa_groups_posted: bool(f.fldQAzmmDYfs0FMQa), google_indexed: bool(f.fldykjQ9cdxkZXk8H),
    land_extent_perches: num(f.fldZ6zmeTRZD0zmO7), built_up_area_sqft: num(f.fldWG3EevgAYxVloK), number_of_floors: int(f.fldaX79ZcL0kSFIHc),
    garden: bool(f.fldXnGjcAozKTDqFV), garden_size_perches: num(f.fldyQQkgro89KiqJI), servant_quarters: bool(f.fldQ123FNOm3MlBIo),
    boundary_wall: bool(f.fldjm18OjKxkG37W0), water_source: enumOf(P, r.id, "water source", f.fldFJHYpOjfLTKCUN, ENUM.water_source),
    roof_type: txt(f.fldiAL4dHPuE28Px6), generator: bool(f.fldT0qigjzWVNDGGe),
    frontage_ft: num(f.fldZwBu58prboDfeB), depth_ft: num(f.fldOi0WEhP3PwWJeV),
    land_shape: enumOf(P, r.id, "land shape", f.fld8jH9DhDdQqXTtU, ENUM.land_shape),
    land_category: enumOf(P, r.id, "land category", f.fldQpRdYcj1scSAme, ENUM.land_category),
    beachfront: bool(f.fldhxhAloIhTgUKgA), beach_frontage_ft: num(f.fldebzwJ4TaoNsHua), distance_to_sea_ft: num(f.fldaL1lxWnQyUgL2n),
    title_type: enumOf(P, r.id, "title type", f.fldYyby4vVUiIvNyT, ENUM.title_type), road_access_width_ft: num(f.fldX1zSpflnzpH3Ft),
    electricity_available: bool(f.fldXSRxTrKAfdpRSN), water_mains_available: bool(f.fldyvQbsJWS4Bw45Q),
    telecom_available: bool(f.fldFkMHyxohGeKPtl), subdivided: bool(f.fldXpelCbXQz8KEIp),
    pool: bool(f.fldi6bRdNdOR7GT5U), pool_size: enumOf(P, r.id, "pool size", f.fldJZgiMdAMX3ZpvO, ENUM.pool_size),
    sea_view: bool(f.fldJWk4IssqFux2a6), beach_access: bool(f.fldjta65DrgU3fWMi), beach_distance_m: num(f.fldfyTymAogCkp86W),
    outdoor_dining: bool(f.fldIrPLGbgidi4Ogf),
    daily_rate: num(f.fldLhanEAe5m3w7l8), daily_rate_currency: cur(P, r.id, "daily rate currency", f.fldvhRUnvDJWNKamh),
    weekly_rate: num(f.fld89f3woT97qT1QB), monthly_rate_short_let: num(f.fldCDP3jRvTA0ea0p),
    minimum_stay_nights: int(f.fld65ztsZrulJMYXF), max_occupancy: int(f.fldcghrsfMI1c0i98), cleaning_fee: num(f.fldsNxdoIP2XuYXsw),
    commercial_sub_category: enumOf(P, r.id, "commercial sub-category", f.fld13kc6CZcQqimkx, ENUM.commercial_sub_category, { Warehouses: "warehouse" }),
    total_floor_area_sqft: num(f.fldkz0OJk3HIQFKXM), year_built: int(f.fldCdJ4fohaEbuiHi),
    building_grade: enumOf(P, r.id, "building grade", f.fldqKURTxcxHGHzfr, ENUM.building_grade),
    service_charge_lkr: num(f.fld00OwryuwGuHHVM), floors_available: txt(f.fldQTv0oEC7vpWm28),
    workstation_capacity: int(f.fld8ZkYernOV0KHw8), conference_rooms: int(f.fldt9dQYpgcvAV1ox),
    air_conditioning: enumOf(P, r.id, "air conditioning", f.fldeVuAXnLBDe1c2U, ENUM.air_conditioning),
    server_it_room: bool(f.fldm1AyFP9qSOqCIj),
    shared_or_dedicated: enumOf(P, r.id, "shared/dedicated", f.fld8cjQmyHMPn08S0, ENUM.floor_sharing),
    storefront_type: enumOf(P, r.id, "storefront", f.fldiDuiHqriZss5v6, ENUM.storefront_type),
    foot_traffic: enumOf(P, r.id, "foot traffic", f.fldcs83ds7HkxXdMv, ENUM.traffic_level),
    signage_rights: bool(f.flds2vY7kQovQyu9K), ceiling_height_ft: num(f.fldK8LLGrdKEXsLNs), loading_docks: int(f.fldHiJoqicNDcKfmD),
    truck_container_access_40ft: bool(f.fldlef0iM3hGLQwqQ), cold_storage: bool(f.fldhgJs69ZxgH9rmt),
    three_phase_power: bool(f.fldhLsyOBWIYenGHN), bulk_lease_available: bool(f.fldBuIn7GTpWQCTno),
    bulk_discount_pct: num(f.fldtuz00efo3V3li2), bulk_minimum_units: int(f.fldLgvideB7cmF9Ov),
    created_at: r.createdTime,
  };
});
const seen = new Set();
await upsert(P, propRows.filter((p) => p.listing_no && !seen.has(p.listing_no) && seen.add(p.listing_no)));
const propId = await idMap(P);
const propIds = [...propId.values()];
const featureByName = { penthouse: features.get("penthouse"), duplex: features.get("duplex"), "pet friendly": features.get("pet friendly"), "sea view": features.get("sea view") };
await rebuildLinks("property_feature_links", "property_id", propIds, at.properties.flatMap((r) => {
  if (!propId.has(r.id)) return [];
  const names = (r.fields.fldKMG0H6wkvthmYb ?? []).map(norm);
  if (r.fields.fldJWk4IssqFux2a6 === true) names.push("sea view");
  return [...new Set(names)].map((n) => featureByName[n] ? { property_id: propId.get(r.id), feature_id: featureByName[n] } : (problem(P, r.id, `feature "${n}"`), null)).filter(Boolean);
}));
await rebuildLinks("property_source_external_agents", "property_id", propIds, at.properties.flatMap((r) =>
  (r.fields.fldASLliMJRXb8BSQ ?? []).filter((x) => extId.has(x) && propId.has(r.id)).map((x) => ({ property_id: propId.get(r.id), external_agent_id: extId.get(x) }))));

if (APPLY) {
  const { error } = await db.rpc("admin_sync_sequences");
  if (error) problem("sequences", "-", error.message);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.mkdirSync("migration-reports", { recursive: true });
fs.writeFileSync(`migration-reports/${stamp}-${report.target}-${report.mode}.json`, JSON.stringify(report, null, 2));
console.log("\nTable                            Airtable  Written  Failed");
for (const [t, s] of Object.entries(report.tables)) console.log(`  ${t.padEnd(31)} ${String(s.airtable).padStart(8)} ${String(s.written).padStart(8)} ${String(s.failed).padStart(7)}`);
const byMsg = {};
report.problems.forEach((p) => { const k = `${p.table}: ${p.msg.replace(/"[^"]*"/, '"…"').replace(/AX\w+/g, "AX…")}`; byMsg[k] = (byMsg[k] || 0) + 1; });
console.log(`\nProblems: ${report.problems.length}`);
Object.entries(byMsg).sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, n]) => console.log(`  ${String(n).padStart(4)} × ${k}`));
console.log(`\nFull report: migration-reports/${stamp}-${report.target}-${report.mode}.json`);
