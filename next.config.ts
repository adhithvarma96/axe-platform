import type { NextConfig } from "next";
import { readFileSync } from "node:fs";

// Permanent redirects for renamed/retired live pages (docs/migration/redirect-map.csv):
// development slug normalisation, lifestyle renames, /property-type/ pages, retired facility pages.
// (Old listing URLs are handled in src/proxy.ts because they depend on what is published.)
function liveSiteRedirects() {
  const rows = readFileSync("docs/migration/redirect-map.csv", "utf8").trim().split(/\r?\n/).slice(1);
  return rows
    .map((l) => l.split(","))
    .filter(([from, action, to]) => action === "301" && from && to && from !== to)
    .map(([from, , to]) => ({ source: from.replace(/\/$/, ""), destination: to, permanent: true }));
}

const nextConfig: NextConfig = {
  // Live axerealty.lk URLs all end in a slash; keep them identical for SEO.
  trailingSlash: true,
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [
      ...liveSiteRedirects(),
      // Clearpoint has no development record yet; send its page to the area until it does.
      { source: "/development/clearpoint-residencies-apartments-for-sale-rent", destination: "/location/rajagiriya-apartments-for-sale-rent/", permanent: false },
    ];
  },
};

export default nextConfig;
