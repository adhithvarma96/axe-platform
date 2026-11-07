import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { SITE } from "@/lib/site/listing";

// The proxy skips robots.txt, so the host split is repeated here: the internal app and every
// non-production deployment are closed to crawlers; the public site opens only when
// SITE_INDEXABLE=true on production (same switch as the page-level noindex in the site layout).
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = ((await headers()).get("host") ?? "").toLowerCase();
  const forced = process.env.APP_SURFACE;
  const isApp = forced ? forced === "crm" : host.startsWith("app.") || host.startsWith("axe-app");
  const open = !isApp && process.env.VERCEL_ENV === "production" && process.env.SITE_INDEXABLE === "true";
  if (!open) return { rules: { userAgent: "*", disallow: "/" } };
  const base = SITE.url.replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/g/"] },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
