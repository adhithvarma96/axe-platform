#!/usr/bin/env node
// Content corrections for the carried-over page copy (10 Nov 2026). Safe to re-run: every fix is idempotent.
// Run it after scripts/import-site-content.mjs on any database (staging now, production at data load).
//
//   node --env-file=.env.local scripts/fix-site-content.mjs            # dry run: prints every change
//   node --env-file=.env.local scripts/fix-site-content.mjs --apply
//
// What it fixes
//  1. Leftovers from the old WordPress pages: the "Featured Developments" carousel (a run of headings),
//     repeated and empty headings, "👉" buttons and "Schedule a Viewing" link text that is now plain text.
//  2. "listings below": listings now sit above the write-up on every page.
//  3. Price wording: sentences that pointed at removed figures now point at the price guide on the page
//     (rounded brackets from the database, Adhith's decision 10 Nov).
//  4. Factual slips found in review (wrong building named on Colombo 03, Havelock City placement, Cinnamon
//     Life bedroom range, About Us placeholder), and copy for the Sea View page, which had none.
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

/** Generic clean-up for every body. */
function tidy(body) {
  if (!body) return body;
  let lines = body.replace(/\r\n/g, "\n").split("\n");

  // 1a. drop the imported carousel and everything after it
  const cut = lines.findIndex((l) => /^##\s+(featured|other)\s+(developments|locations|lifestyles)\s*$/i.test(l.trim()));
  if (cut >= 0) lines = lines.slice(0, cut);

  // 1b. drop a heading repeated straight after itself, and headings with nothing under them
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith("## ")) {
      const next = lines.slice(i + 1).find((x) => x.trim());
      if (!next || next.trim().startsWith("## ")) continue; // empty heading (or a duplicate followed by another heading)
    }
    out.push(lines[i]);
  }
  let s = out.join("\n");

  // 1c. old buttons as text
  s = s.replace(/👉\s*Schedule a Viewing\s*👉\s*Contact us on (\(\+94\) 77 791 8396) \(WhatsApp Available\)/g, "Contact us on $1 (WhatsApp available) to book a viewing.");
  s = s.replace(/^Schedule a (?:Viewing|Private Tour) or Contact us on (\(\+94\) 77 791 8396) \(WhatsApp Available\)? to /gm, "Contact us on $1 (WhatsApp available) to book a viewing and ");
  s = s.replace(/\(WhatsApp Available\)\s*or \[?Schedule a (?:Viewing|Private Tour|Duplex Tour)\]?( today)? to (explore|discover|find)/g, "(WhatsApp available) to book a viewing$1 and $2");
  s = s.replace(/\(WhatsApp Available\)\s*or \[?Schedule a (?:Viewing|Private Tour|Duplex Tour)\]?/g, "(WhatsApp available) to book a viewing");
  s = s.replace(/^Schedule a Private Tour or Contact us on/gm, "Contact us on");

  // 2. listings are above the write-up now
  s = s.replace(/^((?:Start browsing|Browse|View|Explore)[^\n]*?(?:listings|apartments|units|homes|selection)[^\n]*?) below\./gm, "$1 above.");
  s = s.replace(/Browse current ([^\n]+?) listings below,/g, "Browse current $1 listings above,");
  s = s.replace(/Browse current ([^\n]+?) listings,/g, "Browse current $1 listings above,");

  return s.replace(/\n{3,}/g, "\n\n").trim();
}

/** Page-specific corrections: [find, replace] pairs applied after tidy(). */
const LOCATION_FIXES = {
  "colombo-02-apartments-for-sale-rent": [
    [/Smaller, efficient units command the top of that range;[^\n]*/,
      "Colombo 2 commands some of the highest apartment rents in the city; the price guide on this page shows the current typical range. Smaller, efficient units achieve the highest rent per square foot, while larger luxury floorplates sit lower per square foot but higher in absolute rent. That reflects the area's new-build quality, waterfront position and the depth of USD-paying tenant demand."],
    [/ \(Link each to its development page\.\)/, " You'll find each of them below."],
    [/- How much is rent in Colombo 2\?\s*$/m,
      "- How much is rent in Colombo 2? The price guide on this page shows the current typical monthly rent, rent per square foot and sale price range. Exact figures depend on the building, floor, size and view."],
  ],
  "colombo-05-apartments-for-sale-rent": [
    [/It's one of the stronger value-for-size options among Colombo's central postcodes\. \(Figures from Axe Realty's own closed deals\.\)/,
      "It's one of the stronger value-for-size options among Colombo's central postcodes, with rents per square foot well below the waterfront; the price guide on this page shows the current range."],
    [/alongside the larger Havelock City masterplan on its border\./, "alongside the large Havelock City development in Havelock Town."],
    [/- How much is rent in Colombo 5\?\s*$/m,
      "- How much is rent in Colombo 5? The price guide on this page shows the current typical monthly rent, rent per square foot and sale price range. Larger units are common here, so check the rent per square foot as well as the monthly figure."],
  ],
  "colombo-03-apartments-for-sale-rent": [
    [/explore Cinnamon Life apartments for rent and sale\./, "explore Colombo 03 apartments for rent and sale."],
  ],
};

const DEVELOPMENT_FIXES = {
  "tri-zen-apartments-for-sale-rent": [
    [/What any given unit achieves depends on size, floor and finish\. For Tri-Zen's current unit-level rent and sale range, request a free assessment\./,
      "Tri-Zen's efficient layouts give it one of the highest rents per square foot in Colombo 2; the price guide on this page shows the current typical range. What a given unit achieves depends on size, floor and finish, so for a specific apartment, request a free assessment."],
    [/- What does it cost to rent at Tri-Zen\?\s*$/m,
      "- What does it cost to rent at Tri-Zen? The price guide on this page shows the current typical monthly rent and sale price range at Tri-Zen. Exact figures depend on unit size, floor and finish."],
  ],
  "cinnamon-life-apartments-for-sale-rent": [
    [/Cinnamon Life offers one- to four-bedroom apartments/, "Cinnamon Life offers apartments from one-bedroom suites to five-bedroom penthouses"],
    [/Options range from 1-bedroom apartments to expansive 4-bedroom units,/, "Options range from 1-bedroom suites to 5-bedroom penthouses,"],
    [/What a specific unit achieves depends heavily on tower, floor, size and view — and we track that building's actual rents and sale prices from our live transactions\. For the current, unit-level range at Cinnamon Life, request a free, no-obligation assessment\./,
      "What a specific unit achieves depends heavily on tower, floor, size and view. The price guide on this page shows the current typical range for the building; for a specific apartment, request a free, no-obligation assessment."],
    [/Rents vary by tower, floor, size and view\.$/m, "Rents vary by tower, floor, size and view; the price guide on this page shows the current typical range."],
  ],
  "capitol-twin-peaks-apartments-for-sale-rent": [
    [/\(WhatsApp Available to explore/, "(WhatsApp available) to book a viewing and explore"],
  ],
};

const PAGE_FIXES = {
  "/about-us/": [
    [/Lorem ipsum dolor sit amet[^\n]*/,
      "To make renting, buying and selling an apartment in Colombo simple and transparent: accurate listings with real photos, honest advice on price, and one point of contact from the first viewing to handover."],
    [/^Smart Use of Technology –/m, "- Smart Use of Technology –"],
    [/three core commitments:/, "three core commitments:"],
  ],
};

const SEA_VIEW = {
  path: "/lifestyle/sea-view-apartments-for-sale-rent/",
  title: "Sea View Apartments in Colombo for Sale & Rent",
  meta_description: "Sea-view apartments for sale and rent in Colombo: Galle Face, Port City and Indian Ocean views from Colombo 2 and Colombo 3 towers. Curated by Axe Realty.",
  h1: "Sea View Apartments in Colombo for Sale & Rent",
  intro: "Colombo's best sea views are concentrated along a short stretch of coast: the Galle Face waterfront and Port City in Colombo 2, and the Kollupitiya seafront in Colombo 3. Axe Realty lists sea-view apartments for rent and sale across the towers that face the ocean, from two-bedroom city homes to full-floor penthouses.",
  body: `## Where the sea views are

Most sea-view apartments in Colombo sit in two neighbourhoods. Colombo 2 (Slave Island, Union Place and the Galle Face waterfront) has the newest high-rises, looking out over Galle Face Green, Port City and the ocean. Colombo 3 (Kollupitiya) runs along Marine Drive and Galle Road, with towers that face straight onto the Indian Ocean. Further south, Colombo 4, Colombo 6 and Mount Lavinia offer a handful of beachfront buildings with a quieter, residential feel.

## Buildings known for their views
- Cinnamon Life: ocean and Galle Face views from the Suites and Residence towers, with a mall and hotel downstairs
- Shangri-La / One Galle Face Residencies: directly on the Galle Face waterfront
- 606 – The Address: Kollupitiya, facing the sea along Marine Drive
- Altair: sea and Beira Lake views from its upper floors
- Tri-Zen and 447 Luna Tower: city and ocean views from the higher levels in Colombo 2

## What to check before you commit

The view depends on the floor and the side of the building, and on what is planned next door. Ask which direction the living room and bedrooms face, whether a new tower is going up in front, and how the unit handles the afternoon sun and sea air on its windows and balcony. We walk every viewing with those questions in mind.

## Sea view and value

A clear, permanent ocean view adds to both rent and resale value, and higher floors usually command more. The listings above show what's available now; for a view of a specific building, ask us what's coming up before it reaches the market.`,
};

// The rent and sale hubs only carried the old search form's labels ("Price Range(USD)", "No of Bedrooms").
const INTENT_PAGES = {
  "/apartments-for-rent/": {
    intro: "Axe Realty specialises in apartments for rent in Colombo, from efficient two-bedroom homes near the business district to furnished family apartments and penthouses on the Galle Face waterfront. Every listing below is an apartment we are actively marketing, with its own photos, and you can WhatsApp the team about any of them.",
    body: `## Where to rent in Colombo
- Colombo 2 (Slave Island and Union Place): the newest high-rises, including Cinnamon Life, Tri-Zen, Altair and 447 Luna Tower, and the city's strongest demand from diplomats and corporate tenants
- Colombo 3 (Kollupitiya): sea-facing towers along Marine Drive and Galle Road, close to cafés, embassies and the waterfront
- Colombo 5 (Havelock Town): larger units and family-friendly buildings such as Havelock City, with more space for the rent
- Colombo 7 (Cinnamon Gardens): leafy, quiet and prestigious, with boutique buildings near Independence Square
- Rajagiriya: newer developments with good value, a short drive from the city

## What to expect when renting

Long-term leases in Colombo usually run for a year. Landlords commonly ask for rent in advance plus a refundable deposit, and many apartments in the prime buildings are quoted in US dollars. Terms vary by building and landlord, so we set out exactly what applies, including furnishing and what's included in the rent, before you commit.

## How we help

Tell us your budget, the areas you like and when you need to move. We shortlist apartments that fit, including ones that are not yet listed, arrange viewings around your schedule, and handle the negotiation and paperwork with the landlord. Each area page also has a price guide showing the typical rent range there.`,
  },
  "/apartments-for-sale/": {
    intro: "Browse apartments for sale in Colombo, from new-build units in the Colombo 2 towers to established family apartments in Colombo 3, 5 and 7. Every listing shows the asking price, size and real photos, and our team can tell you how a unit compares with others in the same building.",
    body: `## Where buyers are looking
- Colombo 2: the deepest US-dollar rental market in the city, the first choice for investors buying for yield
- Colombo 3 and Colombo 7: established addresses with larger apartments, popular with families buying a home
- Colombo 5 and Rajagiriya: more space for the money, in newer developments and family-friendly buildings

## What we check for you

Before you make an offer, we confirm the basics with the seller: the title and the approved condominium plan, the monthly service charge and what it covers, parking allocation, and whether the apartment is let and on what terms. We work alongside your lawyer through to the transfer.

## Buying from overseas

Many of our buyers live abroad. We run video viewings, share full photo sets and documents, and coordinate with your lawyer and bank in Sri Lanka. Foreign buyers can purchase apartments in Sri Lanka subject to conditions set by law, so we'll confirm what applies to a specific unit before you commit.

## How much do apartments cost?

Prices depend on the area, building, floor and view. Each area and building page has a price guide showing the typical asking range there, and we can give you a free assessment of any unit.`,
  },
};

async function run() {
  const changes = [];
  const fix = (text, pairs = []) => pairs.reduce((s, [a, b]) => s.replace(a, b), tidy(text));

  for (const [table, map] of [["locations", LOCATION_FIXES], ["developments", DEVELOPMENT_FIXES]]) {
    const { data, error } = await db.from(table).select("id, slug, seo_body").not("seo_body", "is", null);
    if (error) throw error;
    for (const r of data) {
      const next = fix(r.seo_body, map[r.slug]);
      if (next !== r.seo_body) changes.push({ table, key: r.slug, match: { id: r.id }, set: { seo_body: next }, before: r.seo_body });
    }
  }
  const { data: pages, error } = await db.from("site_pages").select("path, body");
  if (error) throw error;
  for (const p of pages) {
    const next = fix(p.body, PAGE_FIXES[p.path]);
    if (p.body && next !== p.body) changes.push({ table: "site_pages", key: p.path, match: { path: p.path }, set: { body: next }, before: p.body });
  }
  for (const [path, copy] of Object.entries(INTENT_PAGES)) {
    const p = await db.from("site_pages").select("intro").eq("path", path).maybeSingle();
    if (!p.data?.intro) {
      const i = changes.findIndex((c) => c.key === path);
      if (i >= 0) changes.splice(i, 1);
      changes.push({ table: "site_pages", key: path, match: { path }, set: { intro: copy.intro, body: copy.body }, before: "" });
    }
  }
  const sea = pages.find((p) => p.path === SEA_VIEW.path);
  if (!sea?.body) changes.push({ table: "site_pages", key: SEA_VIEW.path, upsert: true, set: { ...SEA_VIEW, kind: "lifestyle" }, before: "" });

  for (const c of changes) {
    const after = c.set.seo_body ?? c.set.body ?? "";
    const b = (c.before ?? "").split("\n"), a = after.split("\n");
    console.log(`\n=== ${c.table} ${c.key}: ${b.length} -> ${a.length} lines`);
    for (const l of b) if (!a.includes(l) && l.trim()) console.log(`  - ${l.slice(0, 150)}`);
    for (const l of a) if (!b.includes(l) && l.trim()) console.log(`  + ${l.slice(0, 150)}`);
  }
  console.log(`\n${changes.length} record(s) ${APPLY ? "updating" : "would change (dry run)"}`);
  if (!APPLY) return;
  for (const c of changes) {
    const q = c.upsert
      ? db.from(c.table).upsert({ ...c.set }, { onConflict: "path" })
      : db.from(c.table).update(c.set).match(c.match);
    const { error: e } = await q;
    if (e) throw new Error(`${c.table} ${c.key}: ${e.message}`);
  }
  console.log("done");
}

run().catch((e) => { console.error(e.message ?? e); process.exit(1); });
