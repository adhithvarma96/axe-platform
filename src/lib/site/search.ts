// All Properties search: filtering, sorting and the price-slider scale (server side).
import type { WebListing } from "./data";
import { isRent, isSale } from "./listing";

export type SP = Record<string, string | string[] | undefined>;
export interface Filters {
  intent: "all" | "sale" | "rent";
  type: string;
  locs: string[];
  dev: string;
  beds: number;
  baths: number;
  cur: "LKR" | "USD";
  min: number | null;
  max: number | null;
  life: string[];
  furn: string;
  sort: "new" | "low" | "high";
  show: number;
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? v.split(",") : []).filter(Boolean);
const num = (v: string) => (v && /^\d+$/.test(v) ? Number(v) : null);

export function parseFilters(sp: SP): Filters {
  const intent = one(sp.intent);
  const sort = one(sp.sort);
  return {
    intent: intent === "sale" || intent === "rent" ? intent : "all",
    type: one(sp.type) || "apartment",
    locs: many(sp.loc),
    dev: one(sp.dev),
    beds: Math.min(4, Number(one(sp.beds)) || 0),
    baths: Math.min(4, Number(one(sp.baths)) || 0),
    cur: one(sp.cur) === "LKR" ? "LKR" : "USD",
    min: num(one(sp.min)),
    max: num(one(sp.max)),
    life: many(sp.life),
    furn: one(sp.furn) || "any",
    sort: sort === "low" || sort === "high" ? sort : "new",
    show: Math.min(500, Math.max(12, Number(one(sp.show)) || 12)),
  };
}

export const hasFilters = (sp: SP) => Object.keys(sp).some((k) => !["show"].includes(k) && sp[k]);

/** Price of a listing for the active intent, in the chosen currency (from the central USD/LKR rate). */
export function priceIn(l: WebListing, intent: "sale" | "rent" | "all", cur: "LKR" | "USD"): number | null {
  const useSale = intent === "sale" || (intent === "all" && !l.rent_usd);
  const v = useSale ? (cur === "USD" ? l.sale_usd : l.sale_lkr) : (cur === "USD" ? l.rent_usd : l.rent_lkr);
  return v == null ? null : Number(v);
}

export function matches(l: WebListing, f: Filters, skip?: "loc"): boolean {
  if (f.intent === "rent" && !isRent(l)) return false;
  if (f.intent === "sale" && !isSale(l)) return false;
  if (f.type && l.property_type !== f.type) return false;
  if (skip !== "loc" && f.locs.length && !f.locs.includes(l.location_slug ?? "")) return false;
  if (f.dev && l.development_slug !== f.dev) return false;
  if (f.beds && (f.beds === 4 ? (l.beds ?? 0) < 4 : l.beds !== f.beds)) return false;
  if (f.baths && (l.baths ?? 0) < f.baths) return false;
  if (f.furn !== "any" && l.furnished !== f.furn) return false;
  for (const x of f.life) if (!(l.features ?? []).includes(x)) return false;
  if (f.intent !== "all" && (f.min != null || f.max != null)) {
    const p = priceIn(l, f.intent, f.cur);
    if (p == null) return false;
    if (f.min != null && p < f.min) return false;
    if (f.max != null && p > f.max) return false;
  }
  return true;
}

export function search(all: WebListing[], f: Filters): WebListing[] {
  const out = all.filter((l) => matches(l, f));
  if (f.sort !== "new") {
    const key = (l: WebListing) => priceIn(l, f.intent, "USD") ?? (f.sort === "low" ? Infinity : -Infinity);
    out.sort((a, b) => (f.sort === "low" ? key(a) - key(b) : key(b) - key(a)));
  }
  return out;
}

const FLOOR = { rentUSD: 5000, saleUSD: 1_000_000, rentLKR: 1_500_000, saleLKR: 300_000_000 } as const;
function niceCeil(v: number) {
  const mag = 10 ** Math.floor(Math.log10(v));
  for (const s of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (s * mag >= v) return s * mag;
  return 10 * mag;
}
/** Top of the price slider: the most expensive listing (+10%), rounded up, never below a floor. */
export function sliderTop(all: WebListing[], intent: "sale" | "rent", cur: "LKR" | "USD"): number {
  const highest = Math.max(0, ...all.filter((l) => (intent === "rent" ? isRent(l) : isSale(l))).map((l) => priceIn(l, intent, cur) ?? 0));
  return niceCeil(Math.max(highest * 1.1, FLOOR[`${intent}${cur}`]));
}
