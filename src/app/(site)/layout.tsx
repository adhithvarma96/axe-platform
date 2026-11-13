import type { Metadata } from "next";
import "./site.css";
import { SiteFooter, WhatsAppFloat } from "./components";
import { SITE } from "@/lib/site/listing";
import { Analytics } from "./analytics";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: "Apartments in Colombo for Sale & Rent | Axe Realty", template: "%s - Axe Realty" },
  description: "Colombo's apartment specialists. Apartments for sale and rent across Colombo's top developments and neighbourhoods.",
  openGraph: { siteName: "Axe Realty", type: "website", locale: "en_LK" },
  robots: process.env.VERCEL_ENV === "production" && process.env.SITE_INDEXABLE === "true" ? undefined : { index: false, follow: false },
};

// Header is part of each page (the home page puts it over the hero photo).
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      {/* Who runs this site: lets Google tie every page to the agency (name, address, phone). */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "RealEstateAgent", "@id": `${SITE.url}/#agency`,
        name: SITE.name, url: `${SITE.url}/`, logo: `${SITE.url}/brand/axe-realty-logo.png`, image: `${SITE.url}/brand/axe-realty-logo.png`,
        telephone: SITE.phone, email: SITE.email, priceRange: "$$$",
        address: { "@type": "PostalAddress", streetAddress: "No. 95, Horton Place", addressLocality: "Colombo 07", addressRegion: "Western Province", addressCountry: "LK" },
        areaServed: { "@type": "City", name: "Colombo" },
      }) }} />
      <main>{children}</main>
      <SiteFooter />
      <WhatsAppFloat />
      <Analytics />
    </div>
  );
}
