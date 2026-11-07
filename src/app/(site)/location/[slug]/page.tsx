import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allListings, developments, locations } from "@/lib/site/data";
import { Banner, Copy, coverOf, Crumbs, CtaBand, ListingsBlock, SiteHeader, Tiles } from "../../place";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ intent?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const loc = (await locations()).find((l) => l.slug === slug);
  if (!loc) return { title: "Not found", robots: { index: false } };
  return {
    title: { absolute: `${loc.seo_title ?? `Apartments for Sale & Rent in ${loc.name}`} - Axe Realty` },
    description: loc.seo_meta_description ?? undefined,
    alternates: { canonical: `/location/${slug}/` },
  };
}

export default function LocationPage(props: Props) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<div className="wrap" style={{ padding: "60px 24px" }}>Loading…</div>}>
        <Location {...props} />
      </Suspense>
    </>
  );
}

async function Location({ params, searchParams }: Props) {
  const { slug } = await params;
  const intent = (await searchParams).intent;
  const [locs, devs, all] = await Promise.all([locations(), developments(), allListings()]);
  const loc = locs.find((l) => l.slug === slug);
  if (!loc) notFound();
  const here = all.filter((l) => l.location_slug === slug);
  const devTiles = devs.filter((d) => d.location_slug === slug && d.slug).map((d) => ({ href: `/development/${d.slug}/`, name: d.name ?? "", img: coverOf(all.filter((l) => l.development_slug === d.slug)) }));
  const h1 = loc.seo_title?.split("|")[0].trim() || `Apartments for Sale & Rent in ${loc.name}`;
  const path = `/location/${slug}/`;
  return (
    <>
      <Banner eyebrow={`Apartments in ${loc.name}`} h1={h1} />
      <Crumbs items={[{ href: "/", label: "Home" }, { href: "/apartments-for-sale-rent/", label: "Apartments" }, { label: loc.name ?? "" }]} />
      {loc.seo_intro && <section className="wrap" style={{ paddingTop: 36, paddingBottom: 40 }}><p className="lead">{loc.seo_intro}</p></section>}
      <ListingsBlock title={`Apartments in ${loc.name}`} listings={here} intent={intent === "sale" || intent === "rent" ? intent : "all"} basePath={path} />
      <section className="wrap section"><Copy text={loc.seo_body} /></section>
      {devTiles.length > 0 && (
        <section className="wrap" style={{ paddingBottom: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <h2 className="h2">Developments in {loc.name}</h2>
          <Tiles items={devTiles} />
        </section>
      )}
      <CtaBand title={`Looking for something specific in ${loc.name}?`} text="Tell us your brief. Many of our best units are placed before they are ever listed." />
    </>
  );
}
