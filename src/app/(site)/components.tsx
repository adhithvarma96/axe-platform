import Link from "next/link";
import { cacheLife } from "next/cache";
import { sizes, type WebListing } from "@/lib/site/data";
import { featureLabel, headlinePrice, intentLabel, listingPath, listingTitle, SITE, typeNoun } from "@/lib/site/listing";

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

export const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
export const ICON = {
  bed: "M3 18V7M3 13h18v5M21 18v-3M7 13v-2.5A1.5 1.5 0 0 1 8.5 9h3A1.5 1.5 0 0 1 13 10.5V13",
  bath: "M4 12h16v2.5A4.5 4.5 0 0 1 15.5 19h-7A4.5 4.5 0 0 1 4 14.5zM6 12V6a2 2 0 0 1 3.7-1M7 19l-1 2M17 19l1 2",
  area: "M4 4h16v16H4zM4 9h5V4M15 20v-5h5",
  car: "M5 16h14M6 16l1.5-5h9L18 16M7 16v2M17 16v2M8.5 13.5h.01M15.5 13.5h.01",
  pin: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
};

/** Card name: the building, else "Apartment in Colombo 03". The reference stays visible: clients quote it. */
export function cardName(l: WebListing): string {
  return l.development_name ?? `${typeNoun(l.property_type)} in ${l.location_name ?? "Colombo"}`;
}

export function ListingCard({ l, intent }: { l: WebListing; intent?: "rent" | "sale" }) {
  const cover = sizes(l.cover);
  const img = cover["800"] ?? cover["400"];
  const { price, per } = headlinePrice(l, intent);
  const href = listingPath(l);
  const feature = (l.features ?? []).map(featureLabel)[0];
  return (
    <article className="l-card">
      <Link href={href} className="l-card-media" aria-label={listingTitle(l)} tabIndex={-1}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img.url} alt={`${l.development_name ?? "Apartment"}, ${l.location_name ?? "Colombo"}`} loading="lazy" width={img.width} height={img.height} />
        ) : null}
        <span className="l-chip"><i aria-hidden="true" />{intentLabel(l)}</span>
        {l.status === "reserved" && <span className="l-chip l-chip-hold"><i aria-hidden="true" />Reserved</span>}
      </Link>
      <div className="l-card-body">
        <div className="l-card-head">
          <h3 className="l-card-title"><Link href={href}>{cardName(l)}{feature ? <span className="l-card-feature"> · {feature}</span> : null}</Link></h3>
          <div className="l-card-meta"><span><Icon d={ICON.pin} size={13} />{l.location_name ?? "Colombo"}</span><span>Ref {l.listing_no}</span></div>
        </div>
        <ul className="l-card-facts">
          {l.beds != null && <li><Icon d={ICON.bed} />{l.beds} {l.beds === 1 ? "Bed" : "Beds"}</li>}
          {l.baths != null && <li><Icon d={ICON.bath} />{l.baths} {l.baths === 1 ? "Bath" : "Baths"}</li>}
          {l.square_feet != null && <li><Icon d={ICON.area} />{Math.round(l.square_feet).toLocaleString("en-US")} sq ft</li>}
        </ul>
        <div className="l-card-foot">
          <div className="l-card-price">{price}<span>{per}</span></div>
          <Link href={href} className="l-card-btn"><i aria-hidden="true" />View property</Link>
        </div>
      </div>
    </article>
  );
}
