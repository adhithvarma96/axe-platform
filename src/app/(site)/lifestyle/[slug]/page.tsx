import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allListings, locations, sitePage } from "@/lib/site/data";
import { Banner, chosen, Copy, coverOf, Crumbs, CtaBand, Explore, FactsStrip, LIFESTYLES, ListingsBlock, SiteHeader, Tiles } from "../../place";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ intent?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ls = LIFESTYLES[slug];
  if (!ls) return { title: "Not found", robots: { index: false } };
  const page = await sitePage(`/lifestyle/${slug}/`);
  return {
    title: { absolute: `${page?.title ?? `${ls.name} in Colombo for Sale & Rent`} - Axe Realty` },
    description: page?.meta_description ?? `${ls.name} for sale and rent in Colombo, curated by Axe Realty.`,
    alternates: { canonical: `/lifestyle/${slug}/` },
  };
}

export default function LifestylePage(props: Props) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<div className="wrap" style={{ padding: "60px 24px" }}>Loading…</div>}>
        <Lifestyle {...props} />
      </Suspense>
    </>
  );
}

async function Lifestyle({ params, searchParams }: Props) {
  const { slug } = await params;
  const ls = LIFESTYLES[slug];
  if (!ls) notFound();
  const intent = (await searchParams).intent;
  const [page, all, locs, ...otherPages] = await Promise.all([sitePage(`/lifestyle/${slug}/`), allListings(), locations(),
    ...Object.keys(LIFESTYLES).filter((s) => s !== slug).map((s) => sitePage(`/lifestyle/${s}/`))]);
  const here = all.filter((l) => (l.features ?? []).includes(ls.feature));
  // Areas where this lifestyle actually has listings, most first.
  const areaCount = new Map<string, number>();
  here.forEach((l) => l.location_slug && areaCount.set(l.location_slug, (areaCount.get(l.location_slug) ?? 0) + 1));
  const areas = locs.filter((l) => l.slug && areaCount.has(l.slug)).sort((x, y) => (areaCount.get(y.slug!) ?? 0) - (areaCount.get(x.slug!) ?? 0))
    .map((l) => ({ href: `/location/${l.slug}/`, label: `Apartments in ${l.name}` }));
  const others = Object.entries(LIFESTYLES).filter(([s]) => s !== slug).map(([s, o], i) => ({
    href: `/lifestyle/${s}/`, name: o.name, img: chosen(otherPages[i]?.image) ?? coverOf(all.filter((l) => (l.features ?? []).includes(o.feature))),
  }));
  return (
    <>
      <Banner eyebrow={ls.eyebrow} h1={page?.h1 ?? `${ls.name} in Colombo for Sale & Rent`} />
      <Crumbs items={[{ href: "/", label: "Home" }, { href: "/apartments-for-sale-rent/", label: "Apartments" }, { label: ls.name }]} />
      <FactsStrip listings={here} />
      {page?.intro && <section className="wrap" style={{ paddingTop: 32, paddingBottom: 40 }}><p className="lead">{page.intro}</p></section>}
      <ListingsBlock title={`${ls.name} available now`} listings={here} intent={intent === "sale" || intent === "rent" ? intent : "all"} basePath={`/lifestyle/${slug}/`} />
      <section className="wrap section"><Copy text={page?.body} /></section>
      <section className="wrap" style={{ paddingBottom: 48, display: "flex", flexDirection: "column", gap: 20 }}>
        <h2 className="h2">Other lifestyles</h2>
        <Tiles items={others} />
      </section>
      <Explore groups={[{ title: `Where to find ${ls.name.toLowerCase()}`, links: areas }]} />
      <CtaBand title={`Looking for off-market ${ls.name.toLowerCase()}?`} text="Many of these change hands quietly. Tell us your brief and we'll share what's available before it's listed." />
    </>
  );
}
