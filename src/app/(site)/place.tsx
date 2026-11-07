// Shared template for the ranking pages: hub, rent/sale, location, development, lifestyle.
import Link from "next/link";
import { sizes, type WebListing } from "@/lib/site/data";
import { isRent, isSale, SITE } from "@/lib/site/listing";
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
  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith("## ")) { flush(); blocks.push(<h2 key={`h${blocks.length}`} className="copy-h">{line.slice(3)}</h2>); continue; }
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
        {shown.length > 12 && <Link className="s-btn s-btn-dark" style={{ alignSelf: "center" }} href="/properties/">See all {shown.length} with filters</Link>}
      </div>
    </section>
  );
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

export { SiteHeader };
