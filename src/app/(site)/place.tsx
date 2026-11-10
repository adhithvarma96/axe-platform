// Shared template for the ranking pages: hub, rent/sale, location, development, lifestyle.
import Link from "next/link";
import { sizes, type WebListing } from "@/lib/site/data";
import { isRent, isSale, listingPath, listingTitle, SITE } from "@/lib/site/listing";
import { ListingCard, SiteHeader } from "./components";

/** Renders carried-over copy: "## Heading", "- bullet", blank-line paragraphs. Bold lead-ins ("Label: text") kept. */
export function Copy({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      const items = list;
      blocks.push(
        <ul key={`ul${blocks.length}`} className="copy-list">
          {items.map((li, i) => {
            const m = li.match(/^([^:]{2,40}):\s(.+)$/);
            return <li key={i}>{m ? <><b>{m[1]}:</b> {m[2]}</> : li}</li>;
          })}
        </ul>,
      );
      list = [];
    }
  };
  let lastHeading = "";
  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith("## ")) {
      const h = line.slice(3).trim();
      // The old site's "Featured Developments/Locations" carousels were imported as a run of headings;
      // this page links those itself further down, so the carried-over copy ends there.
      if (/^(featured|other) (developments|locations|lifestyles)$/i.test(h)) break;
      if (h.toLowerCase() === lastHeading) continue; // "## Havelock City" twice in a row
      lastHeading = h.toLowerCase();
      flush(); blocks.push(<h2 key={`h${blocks.length}`} className="copy-h">{h}</h2>); continue;
    }
    lastHeading = "";
    if (line.startsWith("- ")) { list.push(line.slice(2)); continue; }
    flush();
    blocks.push(<p key={`p${blocks.length}`}>{line}</p>);
  }
  flush();
  return <div className="copy">{blocks}</div>;
}

export function Banner({ eyebrow, h1 }: { eyebrow: string; h1: string }) {
  return (
    <section className="banner">
      <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{h1}</h1>
      </div>
    </section>
  );
}

export function Crumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <div className="wrap" style={{ paddingTop: 18 }}>
      <nav className="crumb" aria-label="Breadcrumb">
        {items.map((c, i) => (
          <span key={i} style={{ display: "contents" }}>
            {i > 0 && <span>›</span>}
            {c.href ? <Link href={c.href}>{c.label}</Link> : <span style={{ color: "var(--ink)", fontWeight: 600 }}>{c.label}</span>}
          </span>
        ))}
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, ...(c.href ? { item: `${SITE.url}${c.href}` } : {}) })),
      }) }} />
    </div>
  );
}

/** Listings with the Rent/Sale/All toggle. The toggle uses ?intent= with a canonical to the page itself. */
export function ListingsBlock({ title, listings, intent, basePath }: { title: string; listings: WebListing[]; intent: "all" | "sale" | "rent"; basePath: string }) {
  const shown = listings.filter((l) => intent === "all" || (intent === "rent" ? isRent(l) : isSale(l)));
  const tab = (v: "all" | "sale" | "rent", label: string) => (
    <Link key={v} href={v === "all" ? basePath : `${basePath}?intent=${v}`} scroll={false} className={`choice ${intent === v ? "choice-on" : ""}`} aria-current={intent === v ? "true" : undefined}>{label}</Link>
  );
  return (
    <section className="section section-alt">
      <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <h2 className="h2">{title}</h2>
          <div className="choices seg" role="group" aria-label="Show listings for" style={{ width: "auto" }}>
            {tab("all", "All")}{tab("sale", "For Sale")}{tab("rent", "For Rent")}
          </div>
        </div>
        {shown.length ? (
          <div className="cards">{shown.slice(0, 12).map((l) => <ListingCard key={l.listing_no} l={l} intent={intent === "all" ? undefined : intent} />)}</div>
        ) : (
          <p>No listings here right now. Many of our best units are placed before they are listed. <a href={`https://wa.me/${SITE.whatsapp}`}>WhatsApp us</a> what you need.</p>
        )}
        {shown.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org", "@type": "ItemList", name: title, numberOfItems: shown.length,
          itemListElement: shown.slice(0, 12).map((l, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE.url}${listingPath(l)}`, name: listingTitle(l) })),
        }) }} />}
        {shown.length > 12 && <Link className="s-btn s-btn-dark" style={{ alignSelf: "center" }} href="/properties/">See all {shown.length} with filters</Link>}
      </div>
    </section>
  );
}

/** The image chosen in the app for a location, development or page (800 px), if any. */
export function chosen(image: unknown): string | null {
  return sizes(image)["800"]?.url ?? null;
}

export function coverOf(listings: WebListing[]): string | null {
  for (const l of listings) { const c = sizes(l.cover)["800"]; if (c) return c.url; }
  return null;
}

export function Tiles({ items }: { items: { href: string; name: string; img: string | null }[] }) {
  return (
    <div className="tiles">
      {items.map((t) => (
        <Link key={t.href} className="tile" href={t.href}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {t.img && <img src={t.img} alt="" loading="lazy" />}
          <span className="tile-name">{t.name}</span>
        </Link>
      ))}
    </div>
  );
}

export function CtaBand({ title, text, red = true }: { title: string; text: string; red?: boolean }) {
  return (
    <section className="wrap" style={{ paddingTop: 64, paddingBottom: 72 }}>
      <div style={{ background: red ? "var(--red)" : "var(--ink)", borderRadius: 16, padding: 40, display: "flex", gap: 24, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 420px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 style={{ fontSize: 28, color: "#fff" }}>{title}</h2>
          <p style={{ color: "#fff" }}>{text}</p>
        </div>
        <a className={`s-btn ${red ? "s-btn-dark" : ""}`} href={`https://wa.me/${SITE.whatsapp}`}>WhatsApp {SITE.phone}</a>
      </div>
    </section>
  );
}

/** The four lifestyle pages: URL slug -> listing feature, name and banner eyebrow. */
export const LIFESTYLES: Record<string, { feature: string; name: string; eyebrow: string }> = {
  "penthouse-apartments-for-sale-rent": { feature: "penthouse", name: "Penthouses", eyebrow: "Penthouse Properties" },
  "duplex-apartments-for-sale-rent": { feature: "duplex", name: "Duplex Apartments", eyebrow: "Duplex Properties" },
  "pet-friendly-apartments-for-sale-rent": { feature: "pet-friendly", name: "Pet-Friendly", eyebrow: "Pet-Friendly Properties" },
  "sea-view-apartments-for-sale-rent": { feature: "sea-view", name: "Sea View", eyebrow: "Sea-View Properties" },
};

export const lifestyleLinks = (except?: string) =>
  Object.entries(LIFESTYLES).filter(([s]) => s !== except).map(([s, o]) => ({ href: `/lifestyle/${s}/`, label: `${o.name} in Colombo` }));

/** At-a-glance facts from the live listings on this page: counts, bedroom range, freshness. */
export function FactsStrip({ listings, extra = [] }: { listings: WebListing[]; extra?: { k: string; v: string }[] }) {
  if (!listings.length && !extra.length) return null;
  const rent = listings.filter(isRent).length, sale = listings.filter(isSale).length;
  const beds = listings.map((l) => l.beds).filter((b): b is number => b != null);
  const latest = listings.map((l) => l.updated_at ?? l.published_at ?? "").sort().pop();
  const lo = beds.length ? Math.min(...beds) : 0, hi = beds.length ? Math.max(...beds) : 0;
  const facts = [
    ...(listings.length ? [{ k: "Available now", v: String(listings.length) }] : []),
    ...(rent ? [{ k: "For rent", v: String(rent) }] : []),
    ...(sale ? [{ k: "For sale", v: String(sale) }] : []),
    ...(beds.length ? [{ k: "Bedrooms", v: lo === hi ? String(lo) : `${lo}–${hi}` }] : []),
    ...extra,
    ...(latest ? [{ k: "Updated", v: new Date(latest).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) }] : []),
  ];
  return (
    <div className="wrap"><dl className="facts-strip">{facts.map((f) => <div key={f.k}><dt>{f.k}</dt><dd>{f.v}</dd></div>)}</dl></div>
  );
}

/** "Keep exploring": the hub-and-spoke links between areas, buildings and lifestyles. */
export function Explore({ groups }: { groups: { title: string; links: { href: string; label: string }[] }[] }) {
  const shown = groups.filter((g) => g.links.length);
  if (!shown.length) return null;
  return (
    <section className="wrap" style={{ paddingTop: 8, paddingBottom: 24 }}>
      <div className="explore">
        {shown.map((g) => (
          <nav key={g.title} aria-label={g.title}>
            <h2 className="explore-h">{g.title}</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{g.links.map((l) => <Link key={l.href} className="chip" href={l.href}>{l.label}</Link>)}</div>
          </nav>
        ))}
      </div>
    </section>
  );
}

export { SiteHeader };
