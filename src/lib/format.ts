// Display helpers shared by the app and the website.

export function money(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount == null) return "";
  const cur = currency ?? "";
  if (cur === "LKR" && amount >= 1_000_000) {
    const m = amount / 1_000_000;
    if (m >= 1000) return `${trim(m / 1000, 2)}B LKR`;
    return `${trim(m, 1)}M LKR`;
  }
  return `${Math.round(amount).toLocaleString("en-US")} ${cur}`.trim();
}

function trim(n: number, digits: number) {
  return n.toFixed(digits).replace(/\.?0+$/, "");
}

export function priceLines(p: {
  asking_rent?: number | null;
  rent_currency?: string | null;
  asking_sale_price?: number | null;
  sale_currency?: string | null;
}): string[] {
  const out: string[] = [];
  if (p.asking_rent) out.push(`${money(p.asking_rent, p.rent_currency)} /mo`);
  if (p.asking_sale_price) out.push(money(p.asking_sale_price, p.sale_currency));
  return out;
}

const LABELS: Record<string, string> = {
  rent_long_term: "Rent (long term)",
  rent_short_term: "Short let",
  sale: "Sale",
  direct_call_ok: "Direct call OK",
  introduce_via_whatsapp_first: "Introduce via WhatsApp first",
  route_through_adhith: "Route through Adhith",
  company_direct: "Company-Direct",
  company_via_referrer: "Company via referrer",
  agent_self_sourced: "Agent self-sourced",
  agent_via_referrer: "Agent via referrer",
  via_agent: "Via agent",
  unknown_via_agent: "Unknown (via agent)",
  off_plan: "Off-plan",
  brand_new: "Brand new",
  under_construction: "Under construction",
};

/** snake_case enum value -> readable label */
export function label(v: string | null | undefined): string {
  if (!v) return "";
  return LABELS[v] ?? v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function date(d: string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Colombo" });
}
