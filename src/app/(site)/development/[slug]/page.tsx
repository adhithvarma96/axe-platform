import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allListings, developments } from "@/lib/site/data";
import { Banner, Copy, Crumbs, CtaBand, ListingsBlock, SiteHeader } from "../../place";

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
  const [devs, all] = await Promise.all([developments(), allListings()]);
  const d = devs.find((x) => x.slug === slug);
  if (!d) notFound();
  const here = all.filter((l) => l.development_slug === slug);
  const h1 = d.seo_title?.split("|")[0].replace(/,\s*Colombo.*$/, "").trim() || `${d.name} Apartments for Sale & Rent`;
  const path = `/development/${slug}/`;
  return (
    <>
      <Banner eyebrow={d.location_name ? `${d.location_name} · Development` : "Development"} h1={h1} />
      <Crumbs items={[
        { href: "/", label: "Home" }, { href: "/apartments-for-sale-rent/", label: "Apartments" },
        ...(d.location_slug ? [{ href: `/location/${d.location_slug}/`, label: d.location_name ?? "" }] : []),
        { label: d.name ?? "" },
      ]} />
      {d.seo_intro && <section className="wrap" style={{ paddingTop: 36, paddingBottom: 40 }}><p className="lead">{d.seo_intro}</p></section>}
      <ListingsBlock title={`${d.name} apartments available`} listings={here} intent={intent === "sale" || intent === "rent" ? intent : "all"} basePath={path} />
      <section className="wrap section"><Copy text={d.seo_body} /></section>
      <CtaBand title={`Own an apartment in ${d.name}?`} text="Get a free, discreet assessment of what your apartment can rent or sell for, based on what similar units actually achieve." red={false} />
    </>
  );
}
