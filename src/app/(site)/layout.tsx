import type { Metadata } from "next";
import "./site.css";
import { SiteFooter, WhatsAppFloat } from "./components";
import { SITE } from "@/lib/site/listing";

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
      <main>{children}</main>
      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}
