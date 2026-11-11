import type { MetadataRoute } from "next";
import { allListings, developments, locations, sizes } from "@/lib/site/data";
import { SITE } from "@/lib/site/listing";

// Public site only (the app host serves a disallow-all robots.txt and no sitemap link).
// Built from the same allow-list views the pages use, so nothing private can leak here.
const STATIC: [string, number][] = [
  ["/", 1], ["/properties/", 0.9], ["/apartments-for-sale-rent/", 0.9], ["/apartments-for-rent/", 0.8],
  ["/apartments-for-sale/", 0.8], ["/list-your-property/", 0.7], ["/colombo-apartment-report/", 0.6],
  ["/about-us/", 0.5], ["/our-team/", 0.5], ["/contact-us/", 0.5], ["/privacy-policy/", 0.2],
];
const LIFESTYLE = ["sea-view", "penthouse", "duplex", "pet-friendly"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url.replace(/\/$/, "");
  const [listings, locs, devs] = await Promise.all([allListings(), locations(), developments()]);
  const latest = listings.reduce<string | null>((m, l) => (l.updated_at && (!m || l.updated_at > m) ? l.updated_at : m), null);
  const at = (d: string | null | undefined) => (d ? new Date(d) : undefined);

  return [
    ...STATIC.map(([path, priority]) => ({ url: base + path, priority, lastModified: path === "/privacy-policy/" ? undefined : at(latest) })),
    ...LIFESTYLE.map((f) => ({ url: `${base}/lifestyle/${f}-apartments-for-sale-rent/`, priority: 0.6, lastModified: at(latest) })),
    // area and building pages only once they have live listings (no thin pages in the index)
    ...locs.filter((l) => l.slug && (l.listing_count ?? 0) > 0).map((l) => ({ url: `${base}/location/${l.slug}/`, priority: 0.7 })),
    ...devs.filter((d) => d.slug && (d.listing_count ?? 0) > 0).map((d) => ({ url: `${base}/development/${d.slug}/`, priority: 0.7 })),
    ...listings.filter((l) => l.slug).map((l) => {
      const cover = sizes(l.cover)["1600"]?.url ?? sizes(l.cover)["800"]?.url;
      return { url: `${base}/property/${l.slug}/`, lastModified: at(l.updated_at), priority: 0.8, images: cover ? [cover] : undefined };
    }),
  ];
}
