import Link from "next/link";
import { cacheLife } from "next/cache";
import { sizes, type WebListing } from "@/lib/site/data";
import { headlinePrice, intentLabel, listingPath, listingTitle, SITE } from "@/lib/site/listing";

export function SiteHeader({ variant = "solid" }: { variant?: "solid" | "hero" }) {
  return (
    <header className={`s-header ${variant === "solid" ? "s-header-solid" : ""}`}>
      <div className="wrap s-header-top">
        <span>Colombo&apos;s apartment specialists</span>
        <span style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          <a href={`https://wa.me/${SITE.whatsapp}`}>WhatsApp {SITE.phone}</a>
          <span>{SITE.email}</span>
        </span>
      </div>
      <div className="wrap s-header-main">
        <Link href="/" aria-label="Axe Realty home" style={{ lineHeight: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/axe-realty-logo.png" alt="Axe Realty" width={173} height={52} style={{ height: 52, width: "auto" }} />
        </Link>
        <nav className="s-nav" aria-label="Main">
          <Link href="/">Home</Link>
          <Link href="/apartments-for-sale-rent/">Apartments</Link>
          <Link href="/properties/">All Properties</Link>
          <Link href="/list-your-property/">List Your Property</Link>
          <Link href="/contact-us/">Contact Us</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="s-footer">
      <div className="wrap s-footer-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/axe-realty-logo.png" alt="Axe Realty" width={160} height={48} style={{ height: 48, width: "auto", alignSelf: "flex-start" }} />
          <p>Axe Realty strives to be a benchmark, working daily to be the most professional and transparent real estate agents in Sri Lanka.</p>
        </div>
        <div>
          <h3>Apartments</h3>
          <Link href="/apartments-for-sale/">For Sale</Link>
          <Link href="/apartments-for-rent/">For Rent</Link>
          <Link href="/lifestyle/penthouse-apartments-for-sale-rent/">Penthouses</Link>
          <Link href="/lifestyle/duplex-apartments-for-sale-rent/">Duplex apartments</Link>
          <Link href="/lifestyle/pet-friendly-apartments-for-sale-rent/">Pet-friendly apartments</Link>
          <Link href="/lifestyle/sea-view-apartments-for-sale-rent/">Sea-view apartments</Link>
        </div>
        <div>
          <h3>Quick Links</h3>
          <Link href="/properties/">All Properties</Link>
          <Link href="/list-your-property/">List Your Property</Link>
          <Link href="/colombo-apartment-report/">Colombo Apartment Report</Link>
          <Link href="/contact-us/">Contact Us</Link>
          <Link href="/privacy-policy/">Privacy Policy</Link>
        </div>
        <div>
          <h3>Contact Info</h3>
          <span style={{ display: "block" }}>{SITE.address}.</span>
          <span style={{ display: "block" }}>{SITE.email}</span>
          <span style={{ display: "block" }}>{SITE.phone} (WhatsApp)</span>
        </div>
      </div>
      <div className="wrap s-footer-bottom">Copyright © <Year /> Axe Realty</div>
    </footer>
  );
}

async function Year() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

export function WhatsAppFloat() {
  return (
    <a className="wa-float" href={`https://wa.me/${SITE.whatsapp}`} aria-label={`WhatsApp Axe Realty on ${SITE.phone}`}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.2.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.1.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3z" /></svg>
    </a>
  );
}

const Icon = ({ d }: { d: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d={d} /></svg>
);

export function ListingCard({ l, intent }: { l: WebListing; intent?: "rent" | "sale" }) {
  const cover = sizes(l.cover);
  const img = cover["800"] ?? cover["400"];
  const { price, per } = headlinePrice(l, intent);
  const href = listingPath(l);
  return (
    <article className="l-card">
      <Link href={href} className="l-card-media" aria-label={listingTitle(l)}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img.url} alt={`${l.development_name ?? "Apartment"}, ${l.location_name ?? "Colombo"}`} loading="lazy" width={img.width} height={img.height} />
        ) : null}
        <span className="l-card-flag" style={{ bottom: 12, background: "var(--ink)" }}>{intentLabel(l)}</span>
        {l.status === "reserved" && <span className="l-card-flag" style={{ top: 12, background: "#8a5300" }}>Reserved</span>}
      </Link>
      <div className="l-card-body">
        <h3 className="l-card-title"><Link href={href}>{listingTitle(l)}</Link></h3>
        <div className="l-card-price">{price}<span>{per}</span></div>
        <ul className="l-card-facts">
          {l.beds != null && <li aria-label={`${l.beds} bedrooms`}><Icon d="M2 18V8M2 13h20v5M22 18v-3M6 13V10h6v3" />{l.beds}</li>}
          {l.baths != null && <li aria-label={`${l.baths} bathrooms`}><Icon d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM6 12V5a2 2 0 0 1 4 0" />{l.baths}</li>}
          {l.parking != null && <li aria-label={`${l.parking} parking`}><Icon d="M4 3h16v18H4zM10 16V8h3a2.5 2.5 0 0 1 0 5h-3" />{l.parking}</li>}
          {l.square_feet != null && <li aria-label="Area"><Icon d="M3 3h18v18H3zM3 9h6V3" />{Math.round(l.square_feet).toLocaleString("en-US")} sq ft</li>}
        </ul>
        <Link href={href} className="s-btn" style={{ marginTop: "auto", alignSelf: "center" }}>View Property</Link>
      </div>
    </article>
  );
}
