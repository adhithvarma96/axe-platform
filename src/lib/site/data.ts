// Website data access. Uses the publishable (anonymous) key only, so it can read
// nothing but the public allow-list views (web_*) and web_gallery(). Cached for up
// to a minute: a listing published in the app appears on the site within ~60s.
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/database.types";

export type WebListing = Database["public"]["Views"]["web_listings"]["Row"];
export type WebLocation = Database["public"]["Views"]["web_locations"]["Row"];
export type WebDevelopment = Database["public"]["Views"]["web_developments"]["Row"];
export interface PhotoSizes { [size: string]: { url: string; width: number; height: number } }

function db() {
  return createClient<Database>(publicEnv.supabaseUrl(), publicEnv.supabaseKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function allListings(): Promise<WebListing[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("listings");
  const { data, error } = await db().from("web_listings").select("*").order("published_at", { ascending: false, nullsFirst: false });
  if (error) throw new Error(`web_listings: ${error.message}`);
  return data ?? [];
}

export async function listingBySlug(slug: string): Promise<WebListing | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("listings");
  const { data } = await db().from("web_listings").select("*").eq("slug", slug).maybeSingle();
  return data ?? null;
}

export async function listingByNo(listingNo: string): Promise<WebListing | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("listings");
  const { data } = await db().from("web_listings").select("*").eq("listing_no", listingNo.toUpperCase()).maybeSingle();
  return data ?? null;
}

export async function locations(): Promise<WebLocation[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("places");
  const { data } = await db().from("web_locations").select("*").order("name");
  return data ?? [];
}

export async function developments(): Promise<WebDevelopment[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("places");
  const { data } = await db().from("web_developments").select("*").order("name");
  return data ?? [];
}

export type WebPage = Database["public"]["Views"]["web_pages"]["Row"];
export async function sitePage(path: string): Promise<WebPage | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("pages");
  const { data } = await db().from("web_pages").select("*").eq("path", path).maybeSingle();
  return data ?? null;
}

export type PriceGuide = Database["public"]["Views"]["web_price_guide"]["Row"];
/** Rounded asking-price bracket for an area or building, or null when too few apartments stand behind it. */
export async function priceGuide(scope: "location" | "development", slug: string): Promise<PriceGuide | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("places");
  const { data, error } = await db().from("web_price_guide").select("*").eq("scope", scope).eq("slug", slug).maybeSingle();
  return error ? null : (data ?? null); // a guide is nice to have: never break the page over it
}

export async function usdLkr(): Promise<number> {
  "use cache";
  cacheLife("hours");
  const { data } = await db().from("web_fx").select("usd_lkr").maybeSingle();
  return Number(data?.usd_lkr) || 0;
}

export async function gallery(token: string) {
  "use cache";
  cacheLife("minutes");
  if (!/^[0-9a-f]{20,40}$/.test(token)) return null;
  const { data } = await db().rpc("web_gallery", { p_token: token });
  return (data as null | {
    listing_no: string; property_type: string; listing_types: string[]; beds: number | null; baths: number | null;
    square_feet: number | null; furnished: string | null; development_name: string | null; location_name: string | null;
    agent_name: string | null; agent_whatsapp: string | null; photos: PhotoSizes[];
  }) ?? null;
}

export const sizes = (v: unknown) => (v ?? {}) as PhotoSizes;

export type WebReview = Database["public"]["Views"]["web_reviews"]["Row"];
export type WebTeamMember = Database["public"]["Views"]["web_team"]["Row"];

export async function reviews(): Promise<WebReview[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("reviews");
  const { data } = await db().from("web_reviews").select("*");
  return data ?? [];
}

export async function team(): Promise<WebTeamMember[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("team");
  const { data } = await db().from("web_team").select("*").order("website_sort").order("name");
  return data ?? [];
}
