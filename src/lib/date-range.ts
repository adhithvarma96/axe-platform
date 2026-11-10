// Date ranges for the CRM's filters. All dates are Colombo calendar dates (YYYY-MM-DD).
// The financial year runs 1 April to 31 March.
import { addDays } from "./crm";

export type RangeKey = "this_week" | "this_month" | "last_month" | "last_3_months" | "last_6_months" | "this_fy" | "last_fy" | "last_12_months" | "all" | "custom";
export interface DateRange { key: RangeKey; from: string | null; to: string | null; label: string; months: number | null }

export const PRESETS: [RangeKey, string][] = [
  ["this_week", "This week"], ["this_month", "This month"], ["last_month", "Last month"], ["last_3_months", "Last 3 months"],
  ["last_6_months", "Last 6 months"], ["this_fy", "This financial year"], ["last_fy", "Last financial year"], ["last_12_months", "Last 12 months"], ["all", "All time"],
];

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const ym = (y: number, m: number) => { const d = new Date(Date.UTC(y, m, 1)); return d.toISOString().slice(0, 10); }; // m may overflow
const monthEnd = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Turns ?range=…&from=…&to=… into concrete dates. Unknown or broken input falls back to `fallback`. */
export function resolveRange(sp: { range?: string; from?: string; to?: string }, on: string, fallback: RangeKey = "this_month"): DateRange {
  const d = new Date(`${on}T00:00:00Z`);
  const y = d.getUTCFullYear(), m = d.getUTCMonth();
  const fyStart = m >= 3 ? y : y - 1;
  const key = (PRESETS.some(([k]) => k === sp.range) || sp.range === "custom" ? sp.range : fallback) as RangeKey;
  const name = (k: RangeKey) => PRESETS.find(([x]) => x === k)?.[1] ?? "";
  switch (key) {
    case "this_week": return { key, from: addDays(on, -((d.getUTCDay() + 6) % 7)), to: on, label: name(key), months: null };
    case "this_month": return { key, from: ym(y, m), to: on, label: name(key), months: 1 };
    case "last_month": return { key, from: ym(y, m - 1), to: monthEnd(y, m - 1), label: name(key), months: 1 };
    case "last_3_months": return { key, from: ym(y, m - 2), to: on, label: name(key), months: 3 };
    case "last_6_months": return { key, from: ym(y, m - 5), to: on, label: name(key), months: 6 };
    case "this_fy": return { key, from: `${fyStart}-04-01`, to: on, label: `FY ${fyStart}/${String(fyStart + 1).slice(2)} to date`, months: (y - fyStart) * 12 + m - 3 + 1 };
    case "last_fy": return { key, from: `${fyStart - 1}-04-01`, to: `${fyStart}-03-31`, label: `FY ${fyStart - 1}/${String(fyStart).slice(2)}`, months: 12 };
    case "last_12_months": return { key, from: addDays(ym(y, m - 11), 0), to: on, label: name(key), months: 12 };
    case "all": return { key, from: null, to: null, label: name(key), months: null };
    case "custom": {
      let from = ISO.test(sp.from ?? "") ? sp.from! : null, to = ISO.test(sp.to ?? "") ? sp.to! : null;
      if (!from && !to) return resolveRange({}, on, fallback);
      if (from && to && from > to) [from, to] = [to, from];
      return { key, from, to, label: `${from ? fmt(from) : "Start"} – ${to ? fmt(to) : "today"}`, months: null };
    }
  }
}

/** Query-string pairs that reproduce a range (empty for the page's default). */
export function rangeParams(r: DateRange, fallback: RangeKey = "this_month"): Record<string, string> {
  if (r.key === fallback) return {};
  if (r.key === "custom") return { range: "custom", ...(r.from ? { from: r.from } : {}), ...(r.to ? { to: r.to } : {}) };
  return { range: r.key };
}

/** Is this date inside the range? (null ends are open) */
export const inRange = (r: DateRange, day: string | null | undefined) => !!day && (!r.from || day >= r.from) && (!r.to || day <= r.to);
