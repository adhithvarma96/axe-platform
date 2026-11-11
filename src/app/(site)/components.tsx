import Link from "next/link";
import { cacheLife } from "next/cache";
import { sizes, type WebListing } from "@/lib/site/data";
import { featureLabel, headlinePrice, intentLabel, listingPath, listingTitle, SITE, typeNoun } from "@/lib/site/listing";

export function SiteHeader({ variant = "solid" }: { variant?: "solid" | "hero" }) {
  return (
    <header className={`s-header ${variant === "solid" ? "s-header-solid" : ""}`}>
      <div className="s-header-top-band">
        <div className="wrap s-header-top">
          <div className="s-top-left">
            <span className="s-social">
              {SITE.social.map(([name, href]) => (
                <a key={name} href={href} target="_blank" rel="noopener" aria-label={`Axe Realty on ${name}`}><SocialIcon name={name} /></a>
              ))}
            </span>
            <span className="s-top-sep" aria-hidden="true" />
            <a href={`https://wa.me/${SITE.whatsapp}`} className="s-top-item"><Icon d={ICON.phone} size={15} />{SITE.phone}</a>
          </div>
          <a href={`mailto:${SITE.email}`} className="s-top-item"><Icon d={ICON.mail} size={15} />{SITE.email}</a>
        </div>
      </div>
      <div className="wrap s-header-main">
        <Link href="/" aria-label="Axe Realty home" className="s-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/axe-realty-logo.png" alt="Axe Realty" width={173} height={52} style={{ height: 52, width: "auto" }} />
        </Link>
        <nav className="s-nav" aria-label="Main">
          <Link href="/">Home</Link>
          <Link href="/about-us/">About Us</Link>
          <Link href="/our-team/">Our Team</Link>
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
export function SocialIcon({ name }: { name: string }) {
  const p: Record<string, React.ReactNode> = {
    Facebook: <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v8h4v-8h3l1-4h-4V8.5c0-.3.2-.5.5-.5z" fill="currentColor" stroke="none" />,
    Instagram: <><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" /></>,
    TikTok: <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.4 2.6 2.2 4.4 5 4.6" />,
    YouTube: <><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="M10.5 9.3v5.4l4.6-2.7z" fill="currentColor" stroke="none" /></>,
    LinkedIn: <><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path d="M8 10.5V16M8 7.8v.1M11.5 16v-5.5M11.5 13c0-1.6 1-2.6 2.3-2.6s2.2.9 2.2 2.6V16" /></>,
  };
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p[name]}</svg>;
}

export const ICON = {
  phone: "M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5L16 14l4 1.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  mail: "M3.5 6.5h17v11h-17zM3.5 7l8.5 6.5L20.5 7",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 12h.01",
  map: "M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6zM9 4v14M15 6v14",
  shield: "M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  handshake: "M3 12l4-4 4 2 3-2 3 1 4 3M7 8v6l4 4 2-1 3 2 4-4M11 18l-2-2",
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
        {l.coming_soon && l.available_from && <span className="l-chip l-chip-soon"><i aria-hidden="true" />Coming soon · {new Date(`${l.available_from}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}</span>}
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
