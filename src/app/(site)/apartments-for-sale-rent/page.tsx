import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { allListings, developments, locations, sitePage } from "@/lib/site/data";
import { Banner, chosen, Copy, coverOf, Crumbs, CtaBand, ListingsBlock, SiteHeader, Tiles } from "../place";

const PATH = "/apartments-for-sale-rent/";
type Props = { searchParams: Promise<{ intent?: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const page = await sitePage(PATH);
  return {
    title: { absolute: page?.title ? `${page.title} - Axe Realty` : "Apartments for Sale & Rent in Colombo - Axe Realty" },
    description: page?.meta_description ?? "Apartments for sale and rent across Colombo's best neighbourhoods and developments, from Colombo's apartment specialists.",
    alternates: { canonical: PATH },
  };
}

export default function HubPage(props: Props) {
  return (
    <>
      <SiteHeader />
      <Banner eyebrow="Apartments in Colombo" h1="Apartments for Sale & Rent in Colombo" />
      <Crumbs items={[{ href: "/", label: "Home" }, { label: "Apartments for Sale & Rent" }]} />
      <Suspense fallback={<div className="wrap" style={{ padding: "60px 24px" }}>Loading…</div>}>
        <Hub {...props} />
      </Suspense>
    </>
  );
}

const LIFESTYLES = [
  ["penthouse", "Penthouses"], ["duplex", "Duplex Apartments"], ["pet-friendly", "Pet-Friendly"], ["sea-view", "Sea View"],
] as const;

async function Hub({ searchParams }: Props) {
  const intent = (await searchParams).intent;
  const [page, all, locs, devs, ...lifePages] = await Promise.all([sitePage(PATH), allListings(), locations(), developments(),
    ...LIFESTYLES.map(([f]) => sitePage(`/lifestyle/${f}-apartments-for-sale-rent/`))]);
  const apartments = all.filter((l) => l.property_type === "apartment");
  const rentN = apartments.filter((l) => (l.listing_types ?? []).some((t) => t.startsWith("rent"))).length;
  const saleN = apartments.filter((l) => (l.listing_types ?? []).includes("sale")).length;
  return (
    <>
      <section className="wrap" style={{ paddingTop: 40, paddingBottom: 48, display: "flex", flexDirection: "column", gap: 14, maxWidth: 900 }}>
        <h2 style={{ fontSize: 30 }}>Colombo&apos;s apartment specialists</h2>
        {page?.intro ? <p className="lead">{page.intro}</p> : (
          <p className="lead">Find your ideal apartment in Colombo, whether you&apos;re buying, renting or investing. Axe Realty specialises exclusively in Colombo apartments, with a refined portfolio of luxury, brand-new and investment-ready homes across the city&apos;s most sought-after developments and neighbourhoods.</p>
        )}
      </section>
      <section className="wrap" style={{ paddingBottom: 64 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: 24 }}>
          {([["/apartments-for-sale/", "Apartments for Sale", `${saleN} listings · brand-new, resale and investment units`, "var(--ink)"],
             ["/apartments-for-rent/", "Apartments for Rent", `${rentN} listings · furnished and long-let`, "var(--red)"]] as const).map(([href, t, s, bg]) => (
            <Link key={href} href={href} style={{ textDecoration: "none", borderRadius: 16, background: bg, padding: 28, display: "flex", flexDirection: "column", gap: 10, minHeight: 160, justifyContent: "center" }}>
              <h2 style={{ color: "#fff", fontSize: 26 }}>{t}</h2>
              <p style={{ color: "#fff", opacity: 0.85 }}>{s}</p>
              <span style={{ color: "#fff", fontWeight: 700 }}>View all →</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="section section-alt">
        <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <h2 className="h2">Browse by Lifestyle</h2>
          <Tiles items={LIFESTYLES.map(([f, n]) => ({ href: `/lifestyle/${f}-apartments-for-sale-rent/`, name: n, img: chosen(lifePages[LIFESTYLES.findIndex((x) => x[0] === f)]?.image) ?? coverOf(all.filter((l) => (l.features ?? []).includes(f))) }))} />
        </div>
      </section>
      <section className="wrap" style={{ paddingTop: 64, paddingBottom: 32, display: "flex", flexDirection: "column", gap: 18 }}>
        <h2 className="h2">Apartments by Location</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{locs.map((l) => <Link key={l.slug} className="chip" href={`/location/${l.slug}/`}>{l.name}</Link>)}</div>
      </section>
      <section className="wrap" style={{ paddingBottom: 64, display: "flex", flexDirection: "column", gap: 18 }}>
        <h2 className="h2">Apartments by Development</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{devs.map((d) => <Link key={d.slug} className="chip" href={`/development/${d.slug}/`}>{d.name}</Link>)}</div>
      </section>
      <ListingsBlock title="Latest Apartments" listings={apartments} intent={intent === "sale" || intent === "rent" ? intent : "all"} basePath={PATH} />
      {page?.body && <section className="wrap section"><Copy text={page.body} /></section>}
      <CtaBand title="Can't find the right apartment?" text="Tell us what you need. Many of our best units are placed before they are ever listed." />
    </>
  );
}
