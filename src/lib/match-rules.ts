// Hard rules for AI matching (SPEC 7.10), kept pure so they can be tested.

/** True when the price sits inside the budget, with 10% tolerance either side. Missing data never excludes. */
export function budgetFits(priceUsd: number | null, minUsd: number | null, maxUsd: number | null): boolean {
  if (priceUsd == null) return true;
  if (maxUsd != null && priceUsd > maxUsd * 1.1) return false;
  if (minUsd != null && priceUsd < minUsd * 0.9) return false;
  return true;
}

/** Bedrooms: exact or one more; missing data never excludes. */
export const bedsFit = (wanted: number | null, beds: number | null) => wanted == null || beds == null || (beds >= wanted && beds <= wanted + 1);
