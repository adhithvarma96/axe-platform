// The best small preview for stored photo variants, whatever size the original was
// (an image narrower than 800 px has no "800" variant, which once made it look unsaved).
type Variants = Record<string, { url?: string; width?: number } | undefined> | null | undefined;

export function previewUrl(v: unknown): string | null {
  const x = v as Variants;
  if (!x) return null;
  return x["800"]?.url ?? x["1600"]?.url ?? x.full?.url ?? x["400"]?.url ?? null;
}

/** Recommended upload sizes, shown beside every upload control. */
export const IDEAL = {
  homeHero: { w: 2400, h: 1350, min: 2048, text: "2400 × 1350 px (16:9, landscape), at least 2048 px wide" },
  page: { w: 2048, h: 1365, min: 1600, text: "2048 × 1365 px (3:2, landscape), at least 1600 px wide" },
  tile: { w: 2048, h: 1365, min: 1600, text: "2048 × 1365 px (3:2, landscape), at least 1600 px wide" },
  headshot: { w: 1200, h: 1200, min: 800, text: "1200 × 1200 px (square), face centred, at least 800 px" },
  listing: { w: 2048, h: 1365, min: 1600, text: "Landscape, at least 1600 px wide (2048 × 1365 is ideal); phone photos are fine" },
} as const;
export type IdealKey = keyof typeof IDEAL;
