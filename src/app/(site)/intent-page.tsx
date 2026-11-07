import Link from "next/link";
import { allListings, locations, sitePage } from "@/lib/site/data";
import { isRent, isSale } from "@/lib/site/listing";
import { ListingCard } from "./components";
import { Banner, Copy, Crumbs, CtaBand, SiteHeader } from "./place";

/** /apartments-for-rent/ and /apartments-for-sale/ */
export async function IntentPage({ intent }: { intent: "rent" | "sale" }) {
  const path = intent === "rent" ? "/apartments-for-rent/" : "/apartments-for-sale/";
  const [page, all, locs] = await Promise.all([sitePage(path), allListings(), locations()]);
  const here = all.filter((l) => l.property_type === "apartment" && (intent === "rent" ? isRent(l) : isSale(l)));
  const noun = intent === "rent" ? "for Rent" : "for Sale";
  return (
    <>
      <SiteHeader />
      <Banner eyebrow={`Apartments ${noun}`} h1={page?.h1 || `Apartments ${noun} in Colombo`} />
      <Crumbs items={[{ href: "/", label: "Home" }, { href: "/apartments-for-sale-rent/", label: "Apartments" }, { label: `Apartments ${noun}` }]} />
      {page?.intro && <section className="wrap" style={{ paddingTop: 36 }}><p className="lead">{page.intro}</p></section>}
      <section className="wrap section" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <h2 className="h2">{here.length} apartments {noun.toLowerCase()}</h2>
          <Link className="s-btn s-btn-dark" href={`/properties/?intent=${intent}`}>Filter by area, beds and price</Link>
        </div>
        <div className="cards">{here.slice(0, 24).map((l) => <ListingCard key={l.listing_no} l={l} intent={intent} />)}</div>
        {here.length > 24 && <Link className="s-btn" style={{ alignSelf: "center" }} href={`/properties/?intent=${intent}`}>See all {here.length}</Link>}
      </section>
      {page?.body && <section className="wrap" style={{ paddingBottom: 40 }}><Copy text={page.body} /></section>}
      <section className="wrap" style={{ paddingBottom: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <h2 className="h2">Apartments {noun.toLowerCase()} by location</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {locs.map((l) => <Link key={l.slug} className="chip" href={`/location/${l.slug}/?intent=${intent}`}>{l.name}</Link>)}
        </div>
      </section>
      <CtaBand title="Can't find the right apartment?" text="Tell us what you need. Many of our best units are placed before they are ever listed." />
    </>
  );
}
