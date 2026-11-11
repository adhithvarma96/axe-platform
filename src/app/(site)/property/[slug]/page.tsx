import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { allListings, listingBySlug, listingByNo, sizes, type WebListing } from "@/lib/site/data";
import { OLD_LISTINGS } from "@/lib/site/old-listings";
import { featureLabel, headlinePrice, intentLabel, isRent, isSale, listingPath, listingTitle, SITE, typeNoun } from "@/lib/site/listing";
import { date, label, money } from "@/lib/format";
import { Icon, ICON, ListingCard, SiteHeader } from "../../components";
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
  if (!l) notFound(); // metadata is resolved before the page streams for crawlers, so they get a real 404
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
  const feature = (l.features ?? []).map(featureLabel)[0];
  const place = l.development_name ?? l.location_name ?? "Colombo";
  const h1 = `${l.beds != null ? `${l.beds} Bed ` : ""}${feature ? `${feature} ` : ""}${typeNoun(l.property_type)} in ${place}`;
  const sqft = l.square_feet != null ? `${Math.round(l.square_feet).toLocaleString("en-US")} sq ft` : null;
  const availableFrom = l.available_from && l.available_from > new Date().toISOString().slice(0, 10) ? date(l.available_from) : "Immediately";
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const specs = [
    l.beds != null && { k: "Bedrooms", v: plural(l.beds, "Bed", "Beds") },
    l.baths != null && { k: "Bathrooms", v: plural(l.baths, "Bath", "Baths") },
    sqft && { k: "Living area", v: sqft },
    l.parking != null && { k: "Parking", v: plural(l.parking, "Space", "Spaces") },
    l.furnished && l.furnished !== "unknown" && { k: "Furnishing", v: label(l.furnished) },
    l.condition && { k: "Condition", v: label(l.condition) },
    { k: "Available", v: availableFrom },
    { k: "Reference", v: l.listing_no ?? "" },
  ].filter(Boolean) as { k: string; v: string }[];
  // Listing agent's public WhatsApp when set in the CRM, else the company line.
  const agentName = l.agent_name ?? "Axe Realty";
  const agentPics = (l.agent_photo ?? null) as Record<string, { url: string }> | null;
  const agentPhoto = l.agent_name ? agentPics?.["800"]?.url ?? agentPics?.full?.url ?? agentPics?.["400"]?.url ?? null : null;
  const initials = agentName.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema(l, photos.map((p) => p.large))) }} />
      <div className="wrap" style={{ paddingTop: 22 }}>
        <nav className="crumb p-crumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span>/</span>
          <Link href="/apartments-for-sale-rent/">Apartments</Link><span>/</span>
          {l.location_slug && <><Link href={`/location/${l.location_slug}/`}>{l.location_name}</Link><span>/</span></>}
          {l.development_slug && <><Link href={`/development/${l.development_slug}/`}>{l.development_name}</Link><span>/</span></>}
          <span aria-current="page">{l.listing_no}</span>
        </nav>
      </div>

      <section className="wrap" style={{ paddingTop: 22, display: "flex", flexDirection: "column", gap: 22 }}>
        <div className="p-head">
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0, flex: "1 1 480px" }}>
            <span className="eyebrow-dot">{intentLabel(l)}{l.status === "reserved" ? " · Reserved" : ""}{l.coming_soon ? ` · Coming soon, available ${availableFrom}` : ""} · Ref {l.listing_no}</span>
            <h1 className="p-title">{h1}</h1>
            <span className="p-sub">
              <Icon d={ICON.pin} size={14} />
              {l.development_slug ? <Link href={`/development/${l.development_slug}/`}>{l.development_name}</Link> : l.development_name}
              {l.development_name && l.location_name ? ", " : ""}
              {l.location_slug ? <Link href={`/location/${l.location_slug}/`}>{l.location_name}</Link> : l.location_name}
            </span>
          </div>
          <div className="p-price">
            {l.price_on_request ? (
              <><span className="p-price-k">Asking price</span><b>Price on request</b></>
            ) : (
              <>
                {rent && <><span className="p-price-k">Asking rent</span><b>{rent}<small> / month</small></b></>}
                {sale && <><span className="p-price-k">{rent ? "Or to buy" : "Asking price"}</span><b className={rent ? "p-price-2" : undefined}>{sale}</b></>}
              </>
            )}
            <a className="s-btn" href="#enquire">Book a viewing</a>
          </div>
        </div>
        <Gallery photos={photos} title={title} />
      </section>

      <section className="wrap" style={{ paddingTop: 36, paddingBottom: 72 }}>
        <div className="p-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 36, minWidth: 0 }}>
            <dl className="p-specs">{specs.map((s) => <div key={s.k}><dt>{s.k}</dt><dd>{s.v}</dd></div>)}</dl>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <span className="eyebrow-dot">Overview</span>
              <h2 className="p-lead">
                {l.beds != null ? `${l.beds} bedroom` : "An"} {typeNoun(l.property_type).toLowerCase()} {intentLabel(l).toLowerCase()}
                {l.development_name ? ` in ${l.development_name}` : ""}{l.location_name ? `, ${l.location_name}` : ""}.
              </h2>
              {l.public_notes && <p style={{ whiteSpace: "pre-line" }}>{l.public_notes}</p>}
            </div>
            {!!l.features?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <span className="eyebrow-dot">Features</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{l.features.map((f) => <span key={f} className="tag">{featureLabel(f)}</span>)}</div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span className="eyebrow-dot">Explore more</span>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {l.development_slug && <Link className="chip" href={`/development/${l.development_slug}/`}>All {l.development_name} apartments</Link>}
                {l.location_slug && <Link className="chip" href={`/location/${l.location_slug}/`}>All {l.location_name} apartments</Link>}
                {(l.features ?? []).map((f) => <Link key={f} className="chip" href={`/lifestyle/${f}-apartments-for-sale-rent/`}>{featureLabel(f)} apartments in Colombo</Link>)}
                <Link className="chip" href="/properties/">Search all properties</Link>
              </div>
            </div>
          </div>

          <aside className="p-aside">
            <div className="advisor">
              <div className="advisor-photo">
                {agentPhoto
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={agentPhoto} alt={agentName} loading="lazy" />
                  : <span aria-hidden="true">{initials}</span>}
              </div>
              <div className="advisor-meta">
                <span className="agent-k">Listing advisor</span>
                <div className="advisor-name">{agentName}</div>
                <div className="advisor-role">{l.agent_name ? (l.agent_title ? `${l.agent_title}, Axe Realty` : "Axe Realty") : "Colombo's apartment specialists"}</div>
              </div>
              <div className="advisor-actions">
                <a href={`/api/contact/?c=call&l=${l.listing_no}&from=property`} rel="nofollow" aria-label={`Call ${agentName}`}><Icon d={ICON.phone} size={18} />Call</a>
                <a href={`/api/contact/?c=email&l=${l.listing_no}&from=property`} rel="nofollow" aria-label={`Email ${agentName}`}><Icon d={ICON.mail} size={18} />Email</a>
                <a className="advisor-wa" href={`/api/contact/?c=whatsapp&l=${l.listing_no}&from=property`} rel="nofollow" aria-label={`WhatsApp ${agentName} about ${l.listing_no}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.2.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.1.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3z" /></svg>
                  WhatsApp
                </a>
              </div>
            </div>
            <div id="enquire" className="enquire-card">
              <h2 style={{ fontSize: 22 }}>Book a viewing</h2>
              <EnquiryForm listingNo={l.listing_no ?? ""} defaultMessage={intro} />
            </div>
          </aside>
        </div>
      </section>

      <Suspense fallback={null}><MoreToExplore l={l} /></Suspense>
    </>
  );
}

/** Three more apartments: same building first, then the same area, then anything else. */
async function MoreToExplore({ l }: { l: WebListing }) {
  const all = (await allListings()).filter((x) => x.listing_no !== l.listing_no);
  const tests = [
    (x: WebListing) => !!l.development_slug && x.development_slug === l.development_slug,
    (x: WebListing) => !!l.location_slug && x.location_slug === l.location_slug,
    () => true,
  ];
  const pick: WebListing[] = [];
  for (const test of tests) for (const x of all) if (pick.length < 3 && test(x) && !pick.includes(x)) pick.push(x);
  if (!pick.length) return null;
  return (
    <section className="section section-alt">
      <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="eyebrow-dot">Keep exploring</span>
            <h2 className="h2">More apartments to explore</h2>
          </div>
          <Link className="l-card-btn" href={l.location_slug ? `/location/${l.location_slug}/` : "/properties/"}>
            <i aria-hidden="true" />{l.location_name ? `All in ${l.location_name}` : "All properties"}
          </Link>
        </div>
        <div className="cards">{pick.map((x) => <ListingCard key={x.listing_no} l={x} />)}</div>
      </div>
    </section>
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
