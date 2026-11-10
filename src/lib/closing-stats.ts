// Closing price patterns (internal only, never the public site): rent and sale price,
// overall and per square foot, grouped by location, development or bedrooms. All in USD,
// using each closing's own USD figure (LKR deals converted at the closing's rate on save).

export type DealKind = "rental" | "sale";
export interface ClosingPoint {
  date: string;
  kind: string;            // rental | short_let | sale
  amountUsd: number | null; // monthly rent for rentals, price for sales
  sqft: number | null;
  location: string | null;
  development: string | null;
  beds: number | null;
}
export interface GroupStat {
  key: string;
  deals: number;
  avg: number;
  median: number;
  min: number;
  max: number;
  psfAvg: number | null; // per sq ft, over deals with a size
  psfDeals: number;
}

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function bedsKey(b: number | null): string {
  if (b == null) return "Unknown";
  if (b === 0) return "Studio";
  return b >= 5 ? "5+ bed" : `${b} bed`;
}

export function groupStats(points: ClosingPoint[], kind: DealKind, by: "location" | "development" | "beds"): GroupStat[] {
  const groups = new Map<string, ClosingPoint[]>();
  for (const p of points) {
    if (p.kind !== kind || p.amountUsd == null || p.amountUsd <= 0) continue;
    const key = by === "beds" ? bedsKey(p.beds) : (p[by] ?? (by === "development" ? "No development (house / standalone)" : "Unknown"));
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const out: GroupStat[] = [];
  for (const [key, ps] of groups) {
    const amts = ps.map((p) => p.amountUsd!);
    const psf = ps.filter((p) => p.sqft && p.sqft > 0).map((p) => p.amountUsd! / p.sqft!);
    out.push({
      key, deals: ps.length, avg: amts.reduce((a, b) => a + b, 0) / amts.length, median: median(amts),
      min: Math.min(...amts), max: Math.max(...amts),
      psfAvg: psf.length ? psf.reduce((a, b) => a + b, 0) / psf.length : null, psfDeals: psf.length,
    });
  }
  if (by === "beds") return out.sort((a, b) => a.key.localeCompare(b.key, "en", { numeric: true }));
  return out.sort((a, b) => b.deals - a.deals || (b.psfAvg ?? 0) - (a.psfAvg ?? 0));
}

/** Deals per calendar month (YYYY-MM), oldest first, with empty months filled in. */
export function byMonth(points: ClosingPoint[], kind?: DealKind): { month: string; deals: number; avg: number | null }[] {
  const pts = points.filter((p) => !kind || p.kind === kind);
  if (!pts.length) return [];
  const months = pts.map((p) => p.date.slice(0, 7)).sort();
  const out: { month: string; deals: number; avg: number | null }[] = [];
  let [y, m] = months[0].split("-").map(Number);
  const last = months[months.length - 1];
  for (;;) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const here = pts.filter((p) => p.date.startsWith(key));
    const amts = here.map((p) => p.amountUsd).filter((x): x is number => x != null && x > 0);
    out.push({ month: key, deals: here.length, avg: amts.length ? amts.reduce((a, b) => a + b, 0) / amts.length : null });
    if (key >= last) break;
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

export function usd(n: number | null, digits = 0): string {
  if (n == null) return "—";
  return `USD ${n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;
}
