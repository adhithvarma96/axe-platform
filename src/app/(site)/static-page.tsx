import type { Metadata } from "next";
import { sitePage } from "@/lib/site/data";
import { Banner, Copy, Crumbs, SiteHeader } from "./place";

/** Text pages carried over from the live site (About, Privacy). */
export async function staticMetadata(path: string, fallbackTitle: string): Promise<Metadata> {
  const page = await sitePage(path);
  return {
    title: { absolute: `${page?.title || fallbackTitle} - Axe Realty` },
    description: page?.meta_description ?? undefined,
    alternates: { canonical: path },
  };
}

export async function StaticPage({ path, eyebrow, h1 }: { path: string; eyebrow: string; h1: string }) {
  const page = await sitePage(path);
  return (
    <>
      <SiteHeader />
      <Banner eyebrow={eyebrow} h1={page?.h1 || h1} />
      <Crumbs items={[{ href: "/", label: "Home" }, { label: h1 }]} />
      <section className="wrap section" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {page?.intro && <p className="lead">{page.intro}</p>}
        <Copy text={page?.body} />
      </section>
    </>
  );
}
