// Website wording for listings (shared by cards, listing pages and the search).
import { money } from "@/lib/format";
import type { WebListing } from "./data";

export const SITE = {
  name: "Axe Realty",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://axerealty.lk",
  phone: "+94 77 791 8396",
  whatsapp: "94777918396",
  email: "adhith@axerealty.lk",
  address: "No. 95, Horton Place, Colombo 07",
  social: [
    ["Facebook", "https://www.facebook.com/axerealtycmb/"],
    ["Instagram", "https://www.instagram.com/axerealtycmb/"],
    ["TikTok", "https://www.tiktok.com/@axerealtycmb"],
    ["YouTube", "https://youtube.com/channel/UCqhS9Xtaz7RzmwL4psD3ZEQ"],
    ["LinkedIn", "https://www.linkedin.com/company/axerealtycmb"],
  ] as [string, string][],
  googleReviews: "https://www.google.com/search?q=Axe+Realty+Colombo+reviews",
};

const FEATURE_LABEL: Record<string, string> = { penthouse: "Penthouse", duplex: "Duplex", "pet-friendly": "Pet Friendly", "sea-view": "Sea View" };
export const featureLabel = (slug: string) => FEATURE_LABEL[slug] ?? slug;

export const isRent = (l: Pick<WebListing, "listing_types">) => (l.listing_types ?? []).some((t) => t.startsWith("rent"));
export const isSale = (l: Pick<WebListing, "listing_types">) => (l.listing_types ?? []).includes("sale");

export function intentLabel(l: Pick<WebListing, "listing_types">): string {
  return isRent(l) && isSale(l) ? "For Rent & Sale" : isSale(l) ? "For Sale" : "For Rent";
}

/** Same pattern as the live site: "Ref: AX260012 – ICC Residencies – Kotte – Penthouse" */
export function listingTitle(l: WebListing): string {
  return [`Ref: ${l.listing_no}`, l.development_name, l.location_name, (l.features ?? []).map(featureLabel)[0]].filter(Boolean).join(" – ");
}

export function typeNoun(t: string | null): string {
  return t === "house" ? "House" : t === "villa" ? "Villa" : t === "land" ? "Land" : t === "commercial" ? "Commercial Property" : "Apartment";
}

/** Main price shown on cards: rent if it rents, else sale. */
export function headlinePrice(l: WebListing, intent?: "rent" | "sale"): { price: string; per: string } {
  if (l.price_on_request) return { price: "Price on request", per: "" };
  const useSale = intent === "sale" || (intent !== "rent" && !l.asking_rent);
  if (useSale && l.asking_sale_price) return { price: money(l.asking_sale_price, l.sale_currency), per: "" };
  if (l.asking_rent) return { price: money(l.asking_rent, l.rent_currency), per: " /month" };
  if (l.asking_sale_price) return { price: money(l.asking_sale_price, l.sale_currency), per: "" };
  return { price: "Price on request", per: "" };
}

export const listingPath = (l: Pick<WebListing, "slug">) => `/property/${l.slug}/`;
export const waLink = (text: string, number = SITE.whatsapp) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
