import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { allListings, developments, locations, sizes } from "@/lib/site/data";
import { SITE } from "@/lib/site/listing";
import { ListingCard, SiteHeader } from "./components";
import { coverOf, Tiles } from "./place";

export const metadata: Metadata = {
  title: { absolute: "Apartments for Sale & Rent in Colombo | Axe Realty" },
  description: "Colombo's apartment specialists. Buy, rent or list luxury, brand-new and investment apartments across Colombo's top developments and neighbourhoods.",
  alternates: { canonical: "/" },
};

const WHY = [
  "100% focused on Colombo apartments, no distractions",
  "Neighbourhood knowledge that guides smarter decisions",
  "Curated listings across top developments and locations",
  "Personalised support through every step of your journey",
  "Transparent, data-backed insights you can trust",
];
const LIFESTYLES = [["penthouse", "Penthouses"], ["duplex", "Duplex Apartments"], ["pet-friendly", "Pet-Friendly"], ["sea-view", "Sea View"]] as const;

export default function Home() {
  return (
    <Suspense fallback={<><SiteHeader /><div style={{ minHeight: 600 }} /></>}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const [all, locs, devs] = await Promise.all([allListings(), locations(), developments()]);
  const hero = all.map((l) => sizes(l.cover)["2048"] ?? sizes(l.cover)["1600"]).find(Boolean);
  const featured = all.slice(0, 8);
  return (
    <>
      <section style={{ position: "relative", background: "#2a2f37", minHeight: 680, display: "flex", flexDirection: "column" }}>
        {hero && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero.url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} fetchPriority="high" />
        )}
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(2,0,0,0.15) 0%, rgba(2,0,0,0.55) 100%)" }} />
        <div style={{ position: "relative", zIndex: 2 }}><SiteHeader variant="hero" /></div>
        <div className="wrap" style={{ position: "relative", zIndex: 2, flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingTop: 40, paddingBottom: 64 }}>
          <div style={{ maxWidth: 560, width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
            <span className="pill" style={{ alignSelf: "flex-start" }}>Buy, Sell or Rent</span>
            <h1 style={{ color: "#fff", fontSize: "clamp(40px, 6vw, 68px)", lineHeight: 1.05 }}>Apartments in Colombo</h1>
            <form action="/properties/" method="get" style={{ background: "rgba(255,255,255,0.92)", borderRadius: 16, padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(180px, 100%), 1fr))", gap: 14 }}>
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 22, flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500, color: "var(--ink)" }}><input type="radio" name="intent" value="sale" defaultChecked style={{ width: 18, height: 18, accentColor: "var(--red)" }} /> Apartments for Sale</label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500, color: "var(--ink)" }}><input type="radio" name="intent" value="rent" style={{ width: 18, height: 18, accentColor: "var(--red)" }} /> Apartments for Rent</label>
              </div>
              <div className="s-field"><label htmlFor="hb">Bedrooms</label>
                <select id="hb" name="beds" defaultValue=""><option value="">Any</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4+</option></select>
              </div>
              <div className="s-field"><label htmlFor="hl">Location</label>
                <select id="hl" name="loc" defaultValue=""><option value="">Any location</option>{locs.map((l) => <option key={l.slug} value={l.slug ?? ""}>{l.name}</option>)}</select>
              </div>
              <button type="submit" className="s-btn" style={{ gridColumn: "1 / -1" }}>Search Property</button>
            </form>
          </div>
        </div>
      </section>

      <section className="wrap section" style={{ display: "flex", flexWrap: "wrap", gap: 48, alignItems: "center" }}>
        <div style={{ flex: "1 1 420px", minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          <span className="pill" style={{ alignSelf: "flex-start" }}>About Axe Realty</span>
          <h2 className="h2">Welcome to Axe Realty</h2>
          <p>Find your ideal apartment in Colombo, whether you&apos;re buying, renting, or listing. At Axe Realty, we specialise exclusively in Colombo apartments, offering a refined portfolio of luxury, brand-new, and investment-ready homes across the city&apos;s most sought-after developments.</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="s-btn" href="/properties/">Explore Listings</Link>
            <Link className="s-btn s-btn-dark" href="/list-your-property/">List Your Property</Link>
          </div>
        </div>
        <div style={{ flex: "1 1 420px", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: 14 }}>
          {WHY.map((t, i) => (
            <div key={t} style={{ background: "var(--section)", borderRadius: 10, padding: 20, display: "flex", gap: 14, alignItems: "flex-start" }}>
              <span style={{ width: 36, height: 36, borderRadius: 8, background: "var(--red)", color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-heading)", fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
              <span style={{ color: "var(--ink)", fontWeight: 600, lineHeight: 1.4 }}>{t}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: "var(--ink)" }} className="section">
        <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="pill" style={{ background: "var(--red)", alignSelf: "flex-start" }}>Lifestyle</span>
            <h2 className="h2" style={{ color: "#fff" }}>Find Apartments by Lifestyle</h2>
          </div>
          <Tiles items={LIFESTYLES.map(([f, n]) => ({ href: `/lifestyle/${f}-apartments-for-sale-rent/`, name: n, img: coverOf(all.filter((l) => (l.features ?? []).includes(f))) }))} />
        </div>
      </section>

      <section className="section section-alt">
        <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 className="h2">Explore Apartments by Location</h2>
            <p>Discover handpicked listings across Colombo&apos;s most desirable neighbourhoods:</p>
          </div>
          <Tiles items={locs.map((l) => ({ href: `/location/${l.slug}/`, name: l.name ?? "", img: coverOf(all.filter((x) => x.location_slug === l.slug)) }))} />
        </div>
      </section>

      {featured.length > 0 && (
        <section className="wrap section" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h2 className="h2">Latest Apartments</h2>
              <p>Handpicked listings from Colombo&apos;s apartment market, updated daily.</p>
            </div>
            <Link className="s-btn" href="/properties/">View all properties</Link>
          </div>
          <div className="cards">{featured.map((l) => <ListingCard key={l.listing_no} l={l} />)}</div>
        </section>
      )}

      <section className="wrap" style={{ paddingBottom: 72 }}>
        <div style={{ background: "var(--red)", borderRadius: 16, padding: 40, display: "flex", gap: 24, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 420px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ fontSize: 30, color: "#fff" }}>Own an Apartment in Colombo?</h2>
            <p style={{ color: "#fff" }}>List your property with Axe Realty for professional marketing, strategic exposure, and serious leads. We&apos;ll handle everything, from pricing to paperwork.</p>
          </div>
          <Link className="s-btn s-btn-dark" href="/list-your-property/">List Your Apartment</Link>
        </div>
      </section>

      <section className="section section-alt">
        <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 className="h2">Find Apartments in Colombo&apos;s Leading Developments</h2>
            <p>Looking for something specific? Start with the most sought-after apartment buildings in Colombo:</p>
          </div>
          <Tiles items={devs.map((d) => ({ href: `/development/${d.slug}/`, name: d.name ?? "", img: coverOf(all.filter((l) => l.development_slug === d.slug)) }))} />
        </div>
      </section>

      <section className="wrap section">
        <div style={{ border: "2px solid var(--red)", borderRadius: 16, padding: 40, display: "flex", gap: 24, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 420px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ fontSize: 30 }}>Not sure where to start?</h2>
            <p>Whether you&apos;re buying, renting, or listing, talk to the team that knows Colombo inside out.</p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a className="s-btn s-btn-wa" href={`https://wa.me/${SITE.whatsapp}`}>WhatsApp {SITE.phone}</a>
            <Link className="s-btn s-btn-dark" href="/list-your-property/">List Your Property</Link>
          </div>
        </div>
      </section>
    </>
  );
}
