#!/usr/bin/env node
// Carries the copy of the live axerealty.lk ranking pages into the new site:
// locations and developments get their slug + SEO title/description/intro/body;
// hub, rent/sale and lifestyle pages go into site_pages.
// Moat rule (SPEC 3.4): any sentence with a per-sq-ft rate or a price is dropped
// and listed in the report for Adhith, never copied.
//
//   node --env-file=.env.local scripts/import-site-content.mjs          # dry run + report
//   node --env-file=.env.local scripts/import-site-content.mjs --apply
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const UA = { "User-Agent": "AxeRealtyMigrationAudit/1.0" };
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const redirects = Object.fromEntries(
  fs.readFileSync("docs/migration/redirect-map.csv", "utf8").trim().split(/\r?\n/).slice(1).map((l) => l.split(",")).map(([o, a, n]) => [o, { action: a, to: n }]),
);
const inventory = fs.readFileSync("docs/migration/url-inventory.csv", "utf8").trim().split(/\r?\n/).slice(1).map((l) => l.match(/^([^,]+),([^,]+),/)).filter(Boolean).map((m) => ({ type: m[1], path: m[2] }));

const report = { pages: [], removed_for_moat_rule: [], unmatched: [] };
const MOAT = /(sq\.?\s?ft|sqft|per\s+sq|psf)\b.*\d|\d.*(\/\s?sq\.?\s?ft|per\s+sq)|US\$\s?\d|USD\s?\d|LKR\s?\d|Rs\.?\s?\d|\$\s?\d[\d,.]*\s?(k|m)?\b/i;

const decode = (s) => s.replace(/&#8217;|&rsquo;/g, "'").replace(/&#8216;|&lsquo;/g, "'").replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
  .replace(/&#8211;|&ndash;/g, "–").replace(/&#8212;|&mdash;/g, "—").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#038;/g, "&").replace(/&#039;/g, "'");
const text = (html) => decode(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

async function extract(path) {
  const html = await (await fetch(`https://axerealty.lk${path}`, { headers: UA })).text();
  const meta = (re) => decode((html.match(re) ?? [])[1] ?? "").trim();
  const title = meta(/<title[^>]*>([\s\S]*?)<\/title>/i).replace(/\s*-\s*Axe Realty\s*$/i, "");
  const description = meta(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const h1 = text((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ?? [])[1] ?? "");
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<header[\s\S]*?<\/header>|<footer[\s\S]*?<\/footer>|<nav[\s\S]*?<\/nav>/gi, "");
  // Blocks in document order; listing cards (a "Ref: AX..." heading and its number bullets) are dropped.
  const blocks = [];
  let inCards = false;
  for (const m of body.matchAll(/<(h2|h3|h4|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const tag = m[1].toLowerCase();
    let t = text(m[2]);
    if (!t) continue;
    if (/^Ref:?\s*AX/i.test(t) || /^Find Apartments for (Rent|Sale)/i.test(t)) { inCards = true; continue; }
    if (inCards) { if (tag === "li" && (/^\d[\d,]*$/.test(t) || /^Apartments (for|For) (Sale|Rent)$/.test(t))) continue; if (tag === "h2" || tag === "h3") inCards = false; else continue; }
    if (/^Properties in /i.test(t) || /strives to be a benchmark/i.test(t) || /^(Quick Links|Contact Info|Apartments)$/i.test(t)) continue;
    // site chrome that isn't inside <header>/<nav> on the live theme: phone numbers and menu items
    if (/^\+?[\d\s()+-]{8,}$/.test(t) || /^(Home|About Us|Contact Us|List Your Property|Apartments for Sale|Apartments For Rent|For Sale|For Rent|Privacy Policy)$/i.test(t)) continue;
    if (/^A X E\s/.test(t)) continue;
    if (h1 && t.startsWith(h1)) t = t.slice(h1.length).trim();
    if (!t) continue;
    if (MOAT.test(t)) {
      // keep the block minus the offending sentences
      const kept = t.split(/(?<=[.!?])\s+/).filter((s) => { if (MOAT.test(s)) { report.removed_for_moat_rule.push({ path, sentence: s }); return false; } return true; }).join(" ");
      if (!kept) continue;
      t = kept;
    }
    blocks.push({ tag, t });
  }
  // Intro = the first real paragraph (the page usually opens with an "Overview" heading).
  const firstP = blocks.findIndex((b) => b.tag === "p" && b.t.split(" ").length >= 12);
  const intro = firstP >= 0 ? blocks[firstP].t : "";
  const rest = blocks.filter((_, i) => i !== firstP);
  const out = [];
  for (const b of rest) {
    if (b.tag === "h2" || b.tag === "h3" || b.tag === "h4") out.push(`\n## ${b.t}`);
    else if (b.tag === "li") out.push(`- ${b.t}`);
    else out.push(`\n${b.t}`);
  }
  return { title, description, h1, intro, body: out.join("\n").trim() };
}

const norm = (s) => s.toLowerCase().replace(/apartments?|residenc(es|ies)|the|for|sale|rent|colombo|\d+/g, " ").replace(/[^a-z]+/g, " ").trim();
const sim = (a, b) => { const A = new Set(norm(a).split(" ").filter(Boolean)), B = new Set(norm(b).split(" ").filter(Boolean)); if (!A.size || !B.size) return 0; let n = 0; A.forEach((w) => B.has(w) && n++); return n / Math.max(A.size, B.size); };

const { data: locs } = await db.from("locations").select("id, name, slug").is("deleted_at", null);
const { data: devs } = await db.from("developments").select("id, name, slug").is("deleted_at", null);
const finalPath = (p) => (redirects[p]?.action === "301" ? redirects[p].to : p);

for (const { type, path } of inventory) {
  if (!["location", "development", "lifestyle", "property-type"].includes(type)) continue;
  const c = await extract(path);
  const target = finalPath(path);
  const slug = target.split("/").filter(Boolean).pop();
  if (type === "location") {
    const key = slug.replace(/-apartments-for-sale-rent$/, "");
    const want = key.replace(/-/g, " ");
    const loc = locs.find((l) => l.name.toLowerCase().replace(/\b0(\d)\b/, "$1") === want.replace(/\b0(\d)\b/, "$1"))
      ?? locs.find((l) => l.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").includes(want.replace(/^mount /, "mt ")) || want.includes(l.name.toLowerCase()));
    if (!loc) { report.unmatched.push({ path, reason: `no location matching "${want}"` }); continue; }
    report.pages.push({ path, target, record: `location: ${loc.name}`, intro_words: c.intro.split(" ").length, body_words: c.body.split(" ").length });
    if (APPLY) await db.from("locations").update({ slug, seo_title: c.title, seo_meta_description: c.description, seo_intro: c.intro, seo_body: c.body }).eq("id", loc.id);
  } else if (type === "development") {
    const name = c.h1 || c.title;
    // Explicit matches where the live page name and the Airtable name differ.
    const OVERRIDE = { "colombo-city-centre": /^colombo city cent(er|re)/i, clearpoint: /clearpoint/i, "shangri-la": /shangri-?la/i, "tri-zen": /^tri-?zen/i };
    const key = Object.keys(OVERRIDE).find((k) => slug.startsWith(k));
    const forced = key ? devs.find((d) => OVERRIDE[key].test(d.name)) : null;
    const ranked = forced ? [{ d: forced, s: 1 }] : devs.map((d) => ({ d, s: sim(name.replace(/apartments.*$/i, ""), d.name) })).sort((a, b) => b.s - a.s);
    const best = ranked[0];
    if (!best || best.s < 0.5) { report.unmatched.push({ path, reason: `no development matching "${name}" (best: ${best?.d.name} ${best?.s.toFixed(2)})` }); continue; }
    report.pages.push({ path, target, record: `development: ${best.d.name}`, match: best.s.toFixed(2), intro_words: c.intro.split(" ").length, body_words: c.body.split(" ").length });
    if (APPLY) await db.from("developments").update({ slug, seo_title: c.title, seo_meta_description: c.description, seo_intro: c.intro, seo_body: c.body }).eq("id", best.d.id);
  } else {
    const kind = type === "lifestyle" ? "lifestyle" : "intent";
    report.pages.push({ path, target, record: `site page (${kind})`, intro_words: c.intro.split(" ").length, body_words: c.body.split(" ").length });
    if (APPLY) await db.from("site_pages").upsert({ path: target, kind, title: c.title, meta_description: c.description, h1: c.h1, intro: c.intro, body: c.body, source_url: `https://axerealty.lk${path}` });
  }
  await new Promise((r) => setTimeout(r, 300));
}

fs.mkdirSync("migration-reports", { recursive: true });
fs.writeFileSync(`migration-reports/site-content-${APPLY ? "apply" : "dry-run"}.json`, JSON.stringify(report, null, 2));
console.log(`${APPLY ? "Applied" : "Dry run"}: ${report.pages.length} pages matched, ${report.unmatched.length} unmatched, ${report.removed_for_moat_rule.length} sentences removed (moat rule)`);
report.pages.forEach((p) => console.log(`  ${p.target}  <- ${p.record}${p.match ? ` (${p.match})` : ""}  intro ${p.intro_words}w, body ${p.body_words}w`));
report.unmatched.forEach((u) => console.log(`  UNMATCHED ${u.path}: ${u.reason}`));
report.removed_for_moat_rule.forEach((r) => console.log(`  REMOVED ${r.path}: "${r.sentence}"`));
