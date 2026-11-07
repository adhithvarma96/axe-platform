import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { listingBySlug, listingByNo, sizes, type WebListing } from "@/lib/site/data";
import { OLD_LISTINGS } from "@/lib/site/old-listings";
import { featureLabel, headlinePrice, intentLabel, isRent, isSale, listingPath, listingTitle, SITE, typeNoun, waLink } from "@/lib/site/listing";
import { date, label, money } from "@/lib/format";
import { SiteHeader } from "../../components";
import { Gallery } from "../../gallery";
import { EnquiryForm } from "../../forms";

type Props = { params: Promise<{ slug: string }> };

/** Old website addresses: send to the chosen new listing while it's live, else the fallback page. */
async function resolveOld(slug: string): Promise<string | null> {
  const m = OLD_LISTINGS[slug];
  if (!m) return null;
  if ("path" in m) return m.path;
  const l = await listingByNo(m.listing);
  return l ? listingPath(l) : m.fallback;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const l = await listingBySlug(slug);
  if (!l) return { title: "Property not found", robots: { index: false } };
  const { price, per } = headlinePrice(l);
  const share = sizes(l.cover)["share"];
  const title = listingTitle(l);
  const description = `${l.beds ? `${l.beds} bedroom ` : ""}${typeNoun(l.property_type).toLowerCase()} ${intentLabel(l).toLowerCase()} in ${l.development_name ? `${l.development_name}, ` : ""}${l.location_name ?? "Colombo"}. ${price}${per}. ${l.square_feet ? `${Math.round(l.square_feet).toLocaleString("en-US")} sq ft. ` : ""}Contact Axe Realty to arrange a viewing.`;
  return {
    title,
    description,
    alternates: { canonical: listingPath(l) },
    openGraph: { title, description, url: listingPath(l), images: share ? [{ url: share.url, width: share.width, height: share.height }] : undefined },
  };
}

export default function ListingPage({ params }: Props) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<div className="wrap" style={{ padding: "60px 0" }}>Loading…</div>}>
        <Listing params={params} />
      </Suspense>
    </>
  );
}

async function Listing({ params }: Props) {
  const { slug } = await params;
  const l = await listingBySlug(slug);
  if (!l) {
    const to = await resolveOld(slug);
    if (to) permanentRedirect(to);
    notFound();
  }
  const photos = ((l.photos ?? []) as unknown[]).map((p) => {
    const s = sizes(p);
    const t = s["800"] ?? s["400"], big = s["2048"] ?? s["full"] ?? s["1600"] ?? t;
    return { thumb: t?.url ?? "", large: big?.url ?? "", width: big?.width ?? 0, height: big?.height ?? 0 };
  }).filter((p) => p.thumb);
  const title = listingTitle(l);
  const rent = isRent(l) && l.asking_rent ? money(l.asking_rent, l.rent_currency) : null;
  const sale = isSale(l) && l.asking_sale_price ? money(l.asking_sale_price, l.sale_currency) : null;
  const intro = `I'm interested in ${l.listing_no} (${l.development_name ?? typeNoun(l.property_type)}, ${l.location_name ?? "Colombo"}). Is it still available for a viewing?`;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema(l, photos.map((p) => p.large))) }} />
      <div className="wrap" style={{ paddingTop: 22 }}>
        <nav className="crumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span>›</span>
          <Link href="/apartments-for-sale-rent/">Apartments</Link><span>›</span>
          {l.location_slug && <><Link href={`/location/${l.location_slug}/`}>{l.location_name}</Link><span>›</span></>}
          {l.development_slug && <><Link href={`/development/${l.development_slug}/`}>{l.development_name}</Link><span>›</span></>}
          <span style={{ color: "var(--ink)", fontWeight: 600 }}>{l.listing_no}</span>
        </nav>
      </div>

      <section className="wrap" style={{ paddingTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0, flex: "1 1 520px" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="pill">{typeNoun(l.property_type)}s {intentLabel(l)}</span>
              {l.status === "reserved"
                ? <span className="pill" style={{ background: "#fff1d6", color: "#6b4100" }}>Reserved</span>
                : <span className="pill" style={{ background: "#e9f8ee", color: "#136b35" }}>Available</span>}
            </div>
            <h1 style={{ fontSize: "clamp(24px, 3.4vw, 34px)" }}>{title}</h1>
          </div>
          <div style={{ textAlign: "right", fontFamily: "var(--font-heading)", fontWeight: 700, color: "var(--red)" }}>
            {l.price_on_request ? <div style={{ fontSize: 26 }}>Price on request</div> : (
              <>
                {rent && <div style={{ fontSize: 30 }}>{rent}<span style={{ fontSize: 15, color: "var(--text)" }}> /month</span></div>}
                {sale && <div style={{ fontSize: rent ? 22 : 30 }}>{rent ? "Sale: " : ""}{sale}</div>}
              </>
            )}
          </div>
        </div>
        <Gallery photos={photos} title={title} />
      </section>

      <section className="wrap" style={{ paddingTop: 32, paddingBottom: 72, display: "flex", flexWrap: "wrap", gap: 40, alignItems: "flex-start" }}>
        <div style={{ flex: "999 1 560px", minWidth: 0, display: "flex", flexDirection: "column", gap: 32 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
            {l.beds != null && <div className="fact"><b>{l.beds}</b><span>Bedrooms</span></div>}
            {l.baths != null && <div className="fact"><b>{l.baths}</b><span>Bathrooms</span></div>}
            {l.parking != null && <div className="fact"><b>{l.parking}</b><span>Parking</span></div>}
            {l.square_feet != null && <div className="fact"><b>{Math.round(l.square_feet).toLocaleString("en-US")}</b><span>Sq ft</span></div>}
            {l.land_extent_perches != null && <div className="fact"><b>{l.land_extent_perches}</b><span>Perches</span></div>}
          </div>
          {l.public_notes && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h2 style={{ fontSize: 26 }}>Property Description</h2>
              <p style={{ whiteSpace: "pre-line" }}>{l.public_notes}</p>
            </div>
          )}
          <div>
            <h2 style={{ fontSize: 26, marginBottom: 8 }}>Property Overview</h2>
            <div className="kv"><span>Reference</span><b>{l.listing_no}</b></div>
            {l.development_name && <div className="kv"><span>Development</span><b>{l.development_slug ? <Link href={`/development/${l.development_slug}/`}>{l.development_name}</Link> : l.development_name}</b></div>}
            {l.location_name && <div className="kv"><span>Location</span><b>{l.location_slug ? <Link href={`/location/${l.location_slug}/`}>{l.location_name}</Link> : l.location_name}</b></div>}
            {l.square_feet != null && <div className="kv"><span>Area</span><b>{Math.round(l.square_feet).toLocaleString("en-US")} sq ft</b></div>}
            {l.furnished && l.furnished !== "unknown" && <div className="kv"><span>Furnishing</span><b>{label(l.furnished)}</b></div>}
            {l.condition && <div className="kv"><span>Condition</span><b>{label(l.condition)}</b></div>}
            <div className="kv"><span>Available from</span><b>{l.available_from && l.available_from > new Date().toISOString().slice(0, 10) ? date(l.available_from) : "Immediately"}</b></div>
          </div>
          {!!l.features?.length && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h2 style={{ fontSize: 26 }}>Features</h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{l.features.map((f) => <span key={f} className="tag">{featureLabel(f)}</span>)}</div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ fontSize: 20 }}>Explore more</h3>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {l.development_slug && <Link className="chip" href={`/development/${l.development_slug}/`}>All {l.development_name} apartments</Link>}
              {l.location_slug && <Link className="chip" href={`/location/${l.location_slug}/`}>All {l.location_name} apartments</Link>}
              {(l.features ?? []).map((f) => <Link key={f} className="chip" href={`/lifestyle/${f === "penthouse" ? "penthouse" : f}-apartments-for-sale-rent/`}>{featureLabel(f)} apartments in Colombo</Link>)}
              <Link className="chip" href="/properties/">Search all properties</Link>
            </div>
          </div>
        </div>
        <aside style={{ flex: "1 1 340px", minWidth: 0, background: "var(--section)", borderRadius: 16, padding: 28, display: "flex", flexDirection: "column", gap: 14, boxSizing: "border-box" }}>
          <h2 style={{ fontSize: 24 }}>Enquire about this property</h2>
          <EnquiryForm listingNo={l.listing_no ?? ""} defaultMessage={intro} />
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <a className="s-btn s-btn-wa" href={waLink(intro, l.agent_whatsapp?.replace(/\D/g, "") || SITE.whatsapp)}>WhatsApp about {l.listing_no}</a>
            <div style={{ fontSize: 14 }}>Call <b style={{ color: "var(--ink)" }}>{SITE.phone}</b> · {SITE.email}</div>
          </div>
        </aside>
      </section>
    </>
  );
}

function schema(l: WebListing, images: string[]) {
  const url = `${SITE.url}${listingPath(l)}`;
  const offers = [
    !l.price_on_request && l.asking_rent ? { "@type": "Offer", price: l.asking_rent, priceCurrency: l.rent_currency, businessFunction: "http://purl.org/goodrelations/v1#LeaseOut" } : null,
    !l.price_on_request && l.asking_sale_price ? { "@type": "Offer", price: l.asking_sale_price, priceCurrency: l.sale_currency, businessFunction: "http://purl.org/goodrelations/v1#Sell" } : null,
  ].filter(Boolean);
  return [
    {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      name: listingTitle(l),
      url,
      image: images.slice(0, 6),
      datePosted: l.published_at ?? undefined,
      ...(offers.length ? { offers } : {}),
      about: {
        "@type": "Apartment",
        numberOfRooms: l.beds ?? undefined,
        numberOfBathroomsTotal: l.baths ?? undefined,
        floorSize: l.square_feet ? { "@type": "QuantitativeValue", value: l.square_feet, unitCode: "FTK" } : undefined,
        address: { "@type": "PostalAddress", addressLocality: l.location_name ?? "Colombo", addressCountry: "LK" },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE.url}/` },
        { "@type": "ListItem", position: 2, name: "Apartments", item: `${SITE.url}/apartments-for-sale-rent/` },
        ...(l.location_slug ? [{ "@type": "ListItem", position: 3, name: l.location_name, item: `${SITE.url}/location/${l.location_slug}/` }] : []),
        { "@type": "ListItem", position: l.location_slug ? 4 : 3, name: l.listing_no, item: url },
      ],
    },
  ];
}
