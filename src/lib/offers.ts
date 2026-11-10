// The Axe Realty offer templates (docs/Pipeline-Gates-SOP.md, SPEC 8.6).
// Every term stated, nothing assumed: a blank line prints as "N/A".

export type OfferKind = "rental" | "sale";
export type OfferField = { key: string; label: string; section: string; multiline?: boolean; placeholder?: string };
export type Terms = Record<string, string>;

export const RENTAL_FIELDS: OfferField[] = [
  { key: "property", label: "Property (development, tower, unit)", section: "Parties" },
  { key: "landlord", label: "Landlord", section: "Parties" },
  { key: "tenant", label: "Proposed tenant", section: "Parties" },
  { key: "monthly_rent", label: "Monthly rent", section: "Commercial Terms", placeholder: "USD 2,500" },
  { key: "payment_form", label: "Payable in", section: "Commercial Terms", placeholder: "USD cash / LKR bank transfer" },
  { key: "lease_term", label: "Lease term", section: "Commercial Terms" },
  { key: "renewal_rent", label: "Renewal rent", section: "Commercial Terms" },
  { key: "start_date", label: "Start date", section: "Commercial Terms" },
  { key: "occupants", label: "Occupant(s)", section: "Commercial Terms" },
  { key: "furnishing", label: "Furnishing", section: "Commercial Terms" },
  { key: "parking", label: "Parking", section: "Commercial Terms" },
  { key: "upfront_months", label: "Months' rent upfront on signing", section: "Payment Terms" },
  { key: "deposit_months", label: "Security deposit (months' rent)", section: "Payment Terms" },
  { key: "deposit_refund_days", label: "Deposit refunded within (days of handover)", section: "Payment Terms" },
  { key: "balance_cadence", label: "Balance paid", section: "Payment Terms" },
  { key: "management_fees", label: "Management fees & municipal taxes", section: "Outgoings" },
  { key: "utilities", label: "Utilities (electricity, water, gas, internet)", section: "Outgoings" },
  { key: "landlord_extras", label: "Landlord to provide before move-in (one per line)", section: "Landlord to Provide Before Move-in", multiline: true },
  { key: "minimum_term", label: "Minimum term / notice", section: "Conditions" },
  { key: "nationality", label: "Nationality", section: "Tenant Profile" },
  { key: "employer", label: "Employer (company, sector, office)", section: "Tenant Profile" },
  { key: "background", label: "Other relevant background", section: "Tenant Profile" },
];

export const SALE_FIELDS: OfferField[] = [
  { key: "property", label: "Property (development, tower, unit)", section: "Parties" },
  { key: "title_type", label: "Title", section: "Parties", placeholder: "Condominium / Freehold / Leasehold" },
  { key: "seller", label: "Seller", section: "Parties" },
  { key: "buyer", label: "Proposed buyer", section: "Parties" },
  { key: "offer_price", label: "Offer price", section: "Commercial Terms" },
  { key: "price_basis", label: "Firm or negotiable", section: "Commercial Terms" },
  { key: "inclusions", label: "What's included", section: "Commercial Terms" },
  { key: "possession", label: "Possession", section: "Commercial Terms" },
  { key: "funding", label: "Funding", section: "Payment & Financing", placeholder: "Cash / Bank loan, subject to approval within 30 days" },
  { key: "reservation_deposit", label: "Reservation deposit (amount, refundable?, held by, forfeited if)", section: "Payment & Financing" },
  { key: "spa_pct", label: "On signing the SPA", section: "Payment & Financing", placeholder: "10%" },
  { key: "balance_pct", label: "Balance on completion / transfer", section: "Payment & Financing", placeholder: "90%" },
  { key: "reservation_date", label: "Reservation", section: "Timeline" },
  { key: "spa_date", label: "SPA signing", section: "Timeline" },
  { key: "completion_date", label: "Completion / transfer", section: "Timeline" },
  { key: "stamp_duty", label: "Stamp duty", section: "Costs & Taxes" },
  { key: "legal_fees", label: "Notary / legal fees", section: "Costs & Taxes" },
  { key: "mc_dues", label: "Outstanding management-corporation dues", section: "Costs & Taxes" },
  { key: "vat", label: "VAT / other", section: "Costs & Taxes" },
  { key: "nationality", label: "Nationality", section: "Buyer Profile" },
  { key: "funds_source", label: "Source of funds / background (KYC)", section: "Buyer Profile" },
];

export const RENTAL_DEFAULTS: Terms = {
  lease_term: "12 months, with option to renew", renewal_rent: "To be negotiated at market", upfront_months: "4",
  deposit_months: "2", deposit_refund_days: "30", balance_cadence: "Monthly in advance",
  management_fees: "Included in rent, borne by landlord", utilities: "Borne by tenant",
  minimum_term: "6-month minimum, then 2 months' written notice",
};
export const SALE_DEFAULTS: Terms = {
  price_basis: "Negotiable", possession: "Vacant possession on completion", stamp_duty: "Borne by buyer",
  legal_fees: "Each party their own", mc_dues: "Cleared by seller before transfer", vat: "N/A",
};

const FIXED_CONDITIONS: Record<OfferKind, string[]> = {
  rental: [
    "Offer subject to landlord approval and signing of the formal tenancy agreement.",
    "Permitted use: residential only; no subletting without the landlord's written consent.",
  ],
  sale: [
    "Subject to signing the formal Sale & Purchase Agreement.",
    "Subject to clear title, management-corporation NOC, and no encumbrances (buyer's due diligence).",
  ],
};

export const fieldsFor = (k: OfferKind) => (k === "sale" ? SALE_FIELDS : RENTAL_FIELDS);
const v = (t: Terms, k: string) => (t[k] ?? "").trim() || "N/A";

export type OfferSection = { title: string; lines: string[] };

/** The offer as sections of lines, exactly as it is sent (document, PDF and WhatsApp share this). */
export function offerSections(kind: OfferKind, t: Terms): OfferSection[] {
  if (kind === "rental") {
    const extras = (t.landlord_extras ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
    const upfront = Number(t.upfront_months) || null;
    return [
      { title: "Commercial Terms", lines: [
        `Monthly rent: ${v(t, "monthly_rent")}, payable in ${v(t, "payment_form")}`,
        `Lease term: ${v(t, "lease_term")}. Renewal rent: ${v(t, "renewal_rent")}`,
        `Start date: ${v(t, "start_date")}`,
        `Occupant(s): ${v(t, "occupants")}`,
        `Furnishing: ${v(t, "furnishing")}. Inventory and condition list signed at handover`,
        `Parking: ${v(t, "parking")}`,
      ] },
      { title: "Payment Terms", lines: [
        `On signing: ${v(t, "upfront_months")} months' rent upfront`,
        `Security deposit: ${v(t, "deposit_months")} months' rent, refundable within ${v(t, "deposit_refund_days")} days of handover, subject to no damage beyond fair wear and no outstanding dues`,
        `Balance${upfront ? ` (months ${upfront + 1} onwards)` : ""}: ${v(t, "balance_cadence")}`,
      ] },
      { title: "Outgoings", lines: [
        `Management fees & municipal taxes: ${v(t, "management_fees")}`,
        `Utilities (electricity, water, gas, internet): ${v(t, "utilities")}`,
      ] },
      { title: "Landlord to Provide Before Move-in", lines: extras.length ? extras : ["N/A"] },
      { title: "Conditions", lines: [...FIXED_CONDITIONS.rental, `Minimum term / notice: ${v(t, "minimum_term")}`] },
      { title: "Tenant Profile", lines: [`Nationality: ${v(t, "nationality")}`, `Employer: ${v(t, "employer")}`, ...(t.background?.trim() ? [t.background.trim()] : [])] },
    ];
  }
  return [
    { title: "Commercial Terms", lines: [
      `Offer price: ${v(t, "offer_price")} (${v(t, "price_basis")})`,
      `What's included: ${v(t, "inclusions")}`,
      `Possession: ${v(t, "possession")}`,
    ] },
    { title: "Payment & Financing", lines: [
      `Funding: ${v(t, "funding")}`,
      `Reservation deposit: ${v(t, "reservation_deposit")}`,
      `On signing the Sale & Purchase Agreement (SPA): ${v(t, "spa_pct")} of price`,
      `Balance on completion / transfer: ${v(t, "balance_pct")}`,
    ] },
    { title: "Timeline", lines: [`Reservation: ${v(t, "reservation_date")} · SPA signing: ${v(t, "spa_date")} · Completion / transfer: ${v(t, "completion_date")}`] },
    { title: "Costs & Taxes", lines: [
      `Stamp duty: ${v(t, "stamp_duty")}`, `Notary / legal fees: ${v(t, "legal_fees")}`,
      `Outstanding management-corp dues: ${v(t, "mc_dues")}`, `VAT / other: ${v(t, "vat")}`,
    ] },
    { title: "Conditions", lines: [...FIXED_CONDITIONS.sale, ...(/loan/i.test(t.funding ?? "") ? ["Subject to loan approval."] : [])] },
    { title: "Buyer Profile", lines: [`Nationality: ${v(t, "nationality")}`, ...(t.funds_source?.trim() ? [t.funds_source.trim()] : [])] },
  ];
}

export const offerHeading = (kind: OfferKind) => (kind === "sale" ? "AXE REALTY — PURCHASE OFFER" : "AXE REALTY — RENTAL OFFER");

export function partiesLine(kind: OfferKind, t: Terms): string[] {
  return kind === "sale"
    ? [`Property: ${v(t, "property")} · Title: ${v(t, "title_type")}`, `Seller: ${v(t, "seller")} · Proposed Buyer: ${v(t, "buyer")}`]
    : [`Property: ${v(t, "property")}`, `Landlord: ${v(t, "landlord")}`, `Proposed Tenant: ${v(t, "tenant")}`];
}

const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** WhatsApp-ready text (WhatsApp's *bold* markup). */
export function offerText(kind: OfferKind, ref: string, issued: string, validUntil: string, t: Terms): string {
  const out = [`*${offerHeading(kind)}*`, `Offer Ref: ${ref} · Issued: ${fmt(issued)} · Valid until: ${fmt(validUntil)}`, "", ...partiesLine(kind, t)];
  for (const s of offerSections(kind, t)) out.push("", `*${s.title}*`, ...s.lines.map((l) => `• ${l}`));
  out.push("", "Subject to contract.");
  return out.join("\n");
}

export const offerDate = fmt;

/** Default validity: three working days (Mon–Fri) after issue. */
export function threeWorkingDays(from: string): string {
  const d = new Date(`${from}T12:00:00Z`);
  let n = 0;
  while (n < 3) { d.setUTCDate(d.getUTCDate() + 1); if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) n++; }
  return d.toISOString().slice(0, 10);
}
