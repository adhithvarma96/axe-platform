import { addDays } from "@/lib/crm";

export type ClosingMoney = {
  our_commission: number | null;
  commission_currency: string | null;
  usd_lkr_rate: number | null;
  referrer_total: number | null;
  lead_side_agent_id: string | null;
  listing_side_agent_id: string | null;
};

const toLkr = (a: number | null, c: string | null, r: number | null) => (a == null ? 0 : c === "USD" ? Number(a) * Number(r || 0) : Number(a));

/** Revenue toward target: our commission less referral fees, in LKR (USD at the closing's own rate). */
export const closingRevenue = (c: ClosingMoney) =>
  toLkr(c.our_commission, c.commission_currency, c.usd_lkr_rate) - toLkr(c.referrer_total, c.commission_currency, c.usd_lkr_rate);

/**
 * Revenue credited to each agent: half of a closing's revenue per side they worked
 * (the lead side and the listing side are 50 points each). Both sides = the whole closing.
 */
export function revenueByAgent(closings: ClosingMoney[]) {
  const rev = new Map<string, number>();
  const deals = new Map<string, number>();
  for (const c of closings) {
    const half = closingRevenue(c) / 2;
    for (const id of [c.lead_side_agent_id, c.listing_side_agent_id]) if (id) rev.set(id, (rev.get(id) ?? 0) + half);
    for (const id of new Set([c.lead_side_agent_id, c.listing_side_agent_id].filter(Boolean) as string[])) deals.set(id, (deals.get(id) ?? 0) + 1);
  }
  return { rev, deals };
}

/** Monday of this week, first and last day of this month (all Colombo dates). */
export function periods(on: string) {
  const d = new Date(`${on}T00:00:00Z`);
  const monday = addDays(on, -((d.getUTCDay() + 6) % 7));
  const month = `${on.slice(0, 7)}-01`;
  const monthEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  const fyYear = d.getUTCMonth() >= 3 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return { monday, month, monthEnd, fy: `${fyYear}-04-01` };
}

export const METRICS = [
  { key: "viewings", label: "Viewings", period: "week", unit: "a week" },
  { key: "properties_sourced", label: "Properties sourced", period: "week", unit: "a week" },
  { key: "closings", label: "Closings", period: "month", unit: "a month" },
  { key: "revenue_lkr", label: "Revenue (LKR)", period: "month", unit: "a month", adminOnly: true },
] as const;
export type MetricKey = (typeof METRICS)[number]["key"];
