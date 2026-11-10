import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allListings, developments, locations } from "@/lib/site/data";
import { SITE } from "@/lib/site/listing";
import { Banner, chosen, Copy, coverOf, Crumbs, CtaBand, Explore, FactsStrip, lifestyleLinks, ListingsBlock, SiteHeader, Tiles } from "../../place";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ intent?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = (await developments()).find((x) => x.slug === slug);
  if (!d) return { title: "Not found", robots: { index: false } };
  return {
    title: { absolute: `${d.seo_title ?? `${d.name} Apartments for Sale & Rent`} - Axe Realty` },
    description: d.seo_meta_description ?? undefined,
    alternates: { canonical: `/development/${slug}/` },
  };
}

export default function DevelopmentPage(props: Props) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<div className="wrap" style={{ padding: "60px 24px" }}>Loading…</div>}>
        <Development {...props} />
      </Suspense>
    </>
  );
}

async function Development({ params, searchParams }: Props) {
  const { slug } = await params;
  const intent = (await searchParams).intent;
  const [devs, locs, all] = await Promise.all([developments(), locations(), allListings()]);
  const d = devs.find((x) => x.slug === slug);
  if (!d) notFound();
  const here = all.filter((l) => l.development_slug === slug);
  const h1 = d.seo_title?.split("|")[0].replace(/,\s*Colombo.*$/, "").trim() || `${d.name} Apartments for Sale & Rent`;
  const path = `/development/${slug}/`;
  // Other buildings in the same area first: the strongest "related" signal for both people and Google.
  const neighbours = devs.filter((x) => x.slug && x.slug !== slug && x.location_slug && x.location_slug === d.location_slug);
  const neighbourTiles = neighbours.map((x) => ({ href: `/development/${x.slug}/`, name: x.name ?? "", img: chosen(x.image) ?? coverOf(all.filter((l) => l.development_slug === x.slug)) }));
  const otherBuildings = devs.filter((x) => x.slug && x.slug !== slug && x.location_slug !== d.location_slug && (x.listing_count ?? 0) > 0)
    .map((x) => ({ href: `/development/${x.slug}/`, label: x.name ?? "" }));
  const areas = locs.filter((l) => l.slug && (l.listing_count ?? 0) > 0).map((l) => ({ href: `/location/${l.slug}/`, label: `Apartments in ${l.name}` }));
  const extra = [
    ...(d.developer_builder ? [{ k: "Developer", v: d.developer_builder }] : []),
    ...(d.year_completed ? [{ k: "Completed", v: String(d.year_completed) }] : []),
  ];
  const img = chosen(d.image) ?? coverOf(here);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "ApartmentComplex", name: d.name, url: `${SITE.url}${path}`,
        ...(img ? { image: img } : {}),
        address: { "@type": "PostalAddress", addressLocality: d.location_name ?? "Colombo", addressRegion: "Western Province", addressCountry: "LK" },
        ...(d.location_slug ? { containedInPlace: { "@type": "Place", name: d.location_name, url: `${SITE.url}/location/${d.location_slug}/` } } : {}),
      }) }} />
      <Banner eyebrow={d.location_name ? `${d.location_name} · Development` : "Development"} h1={h1} />
      <Crumbs items={[
        { href: "/", label: "Home" }, { href: "/apartments-for-sale-rent/", label: "Apartments" },
        ...(d.location_slug ? [{ href: `/location/${d.location_slug}/`, label: d.location_name ?? "" }] : []),
        { label: d.name ?? "" },
      ]} />
      <FactsStrip listings={here} extra={extra} />
      {d.seo_intro && <section className="wrap" style={{ paddingTop: 32, paddingBottom: 40 }}><p className="lead">{d.seo_intro}</p></section>}
      <ListingsBlock title={`${d.name} apartments available`} listings={here} intent={intent === "sale" || intent === "rent" ? intent : "all"} basePath={path} />
      <section className="wrap section"><Copy text={d.seo_body} /></section>
      {neighbourTiles.length > 0 && (
        <section className="wrap" style={{ paddingBottom: 48, display: "flex", flexDirection: "column", gap: 20 }}>
          <h2 className="h2">More buildings in {d.location_name}</h2>
          <Tiles items={neighbourTiles} />
        </section>
      )}
      <Explore groups={[
        ...(d.location_slug ? [{ title: `About ${d.location_name}`, links: [{ href: `/location/${d.location_slug}/`, label: `All apartments in ${d.location_name}` }] }] : []),
        { title: "Other buildings", links: otherBuildings },
        { title: "Areas", links: areas },
        { title: "Apartments by lifestyle", links: lifestyleLinks() },
      ]} />
      <CtaBand title={`Own an apartment in ${d.name}?`} text="Get a free, discreet assessment of what your apartment can rent or sell for, based on what similar units actually achieve." red={false} />
    </>
  );
}
