import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allListings, sitePage } from "@/lib/site/data";
import { Banner, chosen, Copy, coverOf, Crumbs, CtaBand, ListingsBlock, SiteHeader, Tiles } from "../../place";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ intent?: string }> };

// URL slug -> property feature slug and name
const LIFESTYLES: Record<string, { feature: string; name: string; eyebrow: string }> = {
  "penthouse-apartments-for-sale-rent": { feature: "penthouse", name: "Penthouses", eyebrow: "Penthouse Properties" },
  "duplex-apartments-for-sale-rent": { feature: "duplex", name: "Duplex Apartments", eyebrow: "Duplex Properties" },
  "pet-friendly-apartments-for-sale-rent": { feature: "pet-friendly", name: "Pet-Friendly", eyebrow: "Pet-Friendly Properties" },
  "sea-view-apartments-for-sale-rent": { feature: "sea-view", name: "Sea View", eyebrow: "Sea-View Properties" },
};

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
  const [page, all, ...otherPages] = await Promise.all([sitePage(`/lifestyle/${slug}/`), allListings(),
    ...Object.keys(LIFESTYLES).filter((s) => s !== slug).map((s) => sitePage(`/lifestyle/${s}/`))]);
  const here = all.filter((l) => (l.features ?? []).includes(ls.feature));
  const others = Object.entries(LIFESTYLES).filter(([s]) => s !== slug).map(([s, o], i) => ({
    href: `/lifestyle/${s}/`, name: o.name, img: chosen(otherPages[i]?.image) ?? coverOf(all.filter((l) => (l.features ?? []).includes(o.feature))),
  }));
  return (
    <>
      <Banner eyebrow={ls.eyebrow} h1={page?.h1 ?? `${ls.name} in Colombo for Sale & Rent`} />
      <Crumbs items={[{ href: "/", label: "Home" }, { href: "/apartments-for-sale-rent/", label: "Apartments" }, { label: ls.name }]} />
      {page?.intro && <section className="wrap" style={{ paddingTop: 36, paddingBottom: 40 }}><p className="lead">{page.intro}</p></section>}
      <ListingsBlock title={`${ls.name} available now`} listings={here} intent={intent === "sale" || intent === "rent" ? intent : "all"} basePath={`/lifestyle/${slug}/`} />
      <section className="wrap section"><Copy text={page?.body} /></section>
      <section className="wrap" style={{ paddingBottom: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        <h2 className="h2">Other Lifestyles</h2>
        <Tiles items={others} />
      </section>
      <CtaBand title={`Looking for off-market ${ls.name.toLowerCase()}?`} text="Many of these change hands quietly. Tell us your brief and we'll share what's available before it's listed." />
    </>
  );
}
