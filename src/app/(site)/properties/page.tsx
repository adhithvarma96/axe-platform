import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { allListings, developments, locations, usdLkr } from "@/lib/site/data";
import { hasFilters, matches, parseFilters, search, sliderTop, type Filters, type SP } from "@/lib/site/search";
import { ListingCard, SiteHeader } from "../components";
import { FilterForm, PriceSlider } from "./filters";

type Props = { searchParams: Promise<SP> };

// The plain page is indexed; every filtered variation is noindex with a canonical to /properties/,
// so location, development and lifestyle pages stay the ranking pages.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const filtered = hasFilters(await searchParams);
  return {
    title: "All Properties: Apartments for Sale & Rent in Colombo",
    description: "Search every Axe Realty listing in Colombo. Filter by area, development, bedrooms, price in LKR or USD, and lifestyle.",
    alternates: { canonical: "/properties/" },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

export default function PropertiesPage({ searchParams }: Props) {
  return (
    <>
      <SiteHeader />
      <section className="banner">
        <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          <span className="eyebrow">All Properties</span>
          <h1>Find Your Apartment in Colombo</h1>
          <p style={{ maxWidth: 620 }}>Every Axe Realty listing in one place. Filter by area, building, bedrooms, price and lifestyle.</p>
        </div>
      </section>
      <div className="wrap" style={{ paddingTop: 18 }}>
        <nav className="crumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>›</span><span style={{ color: "var(--ink)", fontWeight: 600 }}>All Properties</span></nav>
      </div>
      <Suspense fallback={<div className="wrap" style={{ padding: "48px 24px" }}>Loading listings…</div>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const TYPES: [string, string][] = [["apartment", "Apartments"], ["house", "Houses"], ["villa", "Villas"], ["land", "Land"], ["commercial", "Commercial"]];
const LIFE: [string, string][] = [["penthouse", "Penthouse"], ["duplex", "Duplex"], ["pet-friendly", "Pet-friendly"], ["sea-view", "Sea view"]];
const FURN: [string, string][] = [["any", "Any"], ["fully", "Fully"], ["semi", "Semi"], ["unfurnished", "Unfurnished"]];

function Choice({ name, value, label, checked, type = "radio" }: { name: string; value: string; label: string; checked: boolean; type?: "radio" | "checkbox" }) {
  return (
    <label className={`choice ${checked ? "choice-on" : ""}`}>
      <input type={type} name={name} value={value} defaultChecked={checked} className="sr-only" />
      {label}
    </label>
  );
}

async function Results({ searchParams }: Props) {
  const sp = await searchParams;
  const f: Filters = parseFilters(sp);
  const [all, locs, devs, rate] = await Promise.all([allListings(), locations(), developments(), usdLkr()]);
  const results = search(all, f);
  const shown = results.slice(0, f.show);
  const locCounts = new Map<string, number>();
  all.filter((l) => matches(l, f, "loc")).forEach((l) => l.location_slug && locCounts.set(l.location_slug, (locCounts.get(l.location_slug) ?? 0) + 1));
  const typeCounts = new Map<string, number>();
  all.forEach((l) => typeCounts.set(l.property_type ?? "", (typeCounts.get(l.property_type ?? "") ?? 0) + 1));
  const where = f.intent === "rent" ? " for rent" : f.intent === "sale" ? " for sale" : "";
  const noun = TYPES.find((t) => t[0] === f.type)?.[1].toLowerCase() ?? "properties";
  const moreQs = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (k === "show" ? [] : (Array.isArray(v) ? v : [v ?? ""]).filter(Boolean).map((x) => [k, x]))));
  moreQs.set("show", String(f.show + 12));
  const usedDevs = new Set(all.map((l) => l.development_slug).filter(Boolean));

  return (
    <FilterForm>
      <div className="wrap" style={{ paddingTop: 28, paddingBottom: 80, display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-start" }}>
        <details className="filters-panel" open>
          <summary>Filters</summary>
          <div className="fgroup">
            <span className="flabel">Property type</span>
            <div className="choices">{TYPES.map(([v, lab]) => <Choice key={v} name="type" value={v} label={`${lab} (${typeCounts.get(v) ?? 0})`} checked={f.type === v} />)}</div>
          </div>
          <div className="fgroup">
            <span className="flabel">Location</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {locs.filter((l) => l.slug).map((l) => (
                <label key={l.slug} className="check-row">
                  <input type="checkbox" name="loc" value={l.slug ?? ""} defaultChecked={f.locs.includes(l.slug ?? "")} />
                  <span style={{ flexGrow: 1 }}>{l.name}</span>
                  <span>{locCounts.get(l.slug ?? "") ?? 0}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="fgroup s-field">
            <label htmlFor="fdev" className="flabel">Development</label>
            <select id="fdev" name="dev" defaultValue={f.dev}>
              <option value="">Any development</option>
              {devs.filter((d) => usedDevs.has(d.slug)).map((d) => <option key={d.slug} value={d.slug ?? ""}>{d.name}</option>)}
            </select>
          </div>
          <div className="fgroup">
            <span className="flabel">Bedrooms</span>
            <div className="choices seg">{[["0", "Any"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4+"]].map(([v, lab]) => <Choice key={v} name="beds" value={v} label={lab} checked={String(f.beds) === v} />)}</div>
          </div>
          <div className="fgroup">
            <span className="flabel">Bathrooms</span>
            <div className="choices seg">{[["0", "Any"], ["1", "1+"], ["2", "2+"], ["3", "3+"], ["4", "4+"]].map(([v, lab]) => <Choice key={v} name="baths" value={v} label={lab} checked={String(f.baths) === v} />)}</div>
          </div>
          <div className="fgroup">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span className="flabel">{f.intent === "rent" ? "Monthly rent" : "Price"}</span>
              <div className="choices seg" style={{ width: "auto" }}>{(["LKR", "USD"] as const).map((c) => <Choice key={c} name="cur" value={c} label={c} checked={f.cur === c} />)}</div>
            </div>
            {f.intent === "all" ? (
              <p style={{ fontSize: 13, background: "#fff", borderRadius: 8, padding: "10px 12px" }}>Choose <b style={{ color: "var(--ink)" }}>For Sale</b> or <b style={{ color: "var(--ink)" }}>For Rent</b> to filter by price.</p>
            ) : (
              <>
                <PriceSlider key={`${f.intent}-${f.cur}`} top={sliderTop(all, f.intent, f.cur)} cur={f.cur} perMonth={f.intent === "rent"} min={f.min} max={f.max} />
                <p style={{ fontSize: 12, lineHeight: 1.5 }}>Listings priced in the other currency are converted at today&apos;s rate{rate ? `: 1 USD = LKR ${rate.toFixed(2)}` : ""}.</p>
              </>
            )}
          </div>
          <div className="fgroup">
            <span className="flabel">Lifestyle</span>
            <div className="choices">{LIFE.map(([v, lab]) => <Choice key={v} type="checkbox" name="life" value={v} label={lab} checked={f.life.includes(v)} />)}</div>
          </div>
          <div className="fgroup" style={{ borderBottom: 0 }}>
            <span className="flabel">Furnishing</span>
            <div className="choices">{FURN.map(([v, lab]) => <Choice key={v} name="furn" value={v} label={lab} checked={f.furn === v} />)}</div>
          </div>
          <noscript><button type="submit" className="s-btn">Apply filters</button></noscript>
          <Link href="/properties/" className="clear-link">Clear all filters</Link>
        </details>

        <section aria-label="Results" style={{ flex: "999 1 560px", minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div className="choices seg" role="group" aria-label="For sale or rent" style={{ width: "auto" }}>
              {(["all", "sale", "rent"] as const).map((v) => <Choice key={v} name="intent" value={v} label={v === "all" ? "All" : v === "sale" ? "For Sale" : "For Rent"} checked={f.intent === v} />)}
            </div>
            <div className="s-field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <label htmlFor="fsort" style={{ whiteSpace: "nowrap" }}>Sort by</label>
              <select id="fsort" name="sort" defaultValue={f.sort} style={{ width: "auto", minWidth: 180 }}>
                <option value="new">Newest first</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
              </select>
            </div>
          </div>
          <h2 style={{ fontSize: 24 }} aria-live="polite">{results.length} {results.length === 1 ? noun.replace(/s$/, "") : noun}{where} in Colombo</h2>
          {shown.length ? (
            <>
              <div className="cards">{shown.map((l) => <ListingCard key={l.listing_no} l={l} intent={f.intent === "all" ? undefined : f.intent} />)}</div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingTop: 8 }}>
                <span style={{ fontSize: 13 }}>Showing {shown.length} of {results.length}</span>
                {results.length > shown.length && <Link className="s-btn s-btn-dark" href={`/properties/?${moreQs}`} scroll={false}>Load more</Link>}
              </div>
            </>
          ) : (
            <div style={{ background: "var(--section)", borderRadius: 14, padding: 36, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
              <h3 style={{ fontSize: 22 }}>No properties match all of these filters</h3>
              <p>Try removing a filter, or tell us what you need. Many of our best units are placed before they are ever listed.</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link className="s-btn s-btn-dark" href="/properties/">Clear all filters</Link>
                <a className="s-btn s-btn-wa" href="https://wa.me/94777918396">WhatsApp +94 77 791 8396</a>
              </div>
            </div>
          )}
        </section>
      </div>
    </FilterForm>
  );
}
