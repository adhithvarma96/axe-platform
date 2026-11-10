// Shared CRM vocabulary: pipeline stages, labels and small helpers (SPEC 2.5, 6.8, 8.1).

export const STAGES = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "viewing_scheduled", label: "Viewing scheduled" },
  { key: "viewing_completed", label: "Viewing completed" },
  { key: "ongoing_negotiations", label: "Ongoing negotiations" },
  { key: "deposit_paid", label: "Deposit paid" },
  { key: "documentation_ready", label: "Documentation ready" },
  { key: "closed_won", label: "Closed won" },
] as const;
export const EXITS = [
  { key: "lost", label: "Lost" },
  { key: "dormant", label: "Dormant" },
] as const;
export type Stage = (typeof STAGES)[number]["key"] | (typeof EXITS)[number]["key"];
export const ALL_STAGES: Stage[] = [...STAGES.map((s) => s.key), ...EXITS.map((s) => s.key)];
/** Stages a lead is actively worked in (the board and "active leads"). */
export const ACTIVE: Stage[] = ["new", "contacted", "viewing_scheduled", "viewing_completed", "ongoing_negotiations", "deposit_paid", "documentation_ready"];
/** Gated stages and the gate that guards each (7.8). */
export const GATED: Partial<Record<Stage, number>> = { ongoing_negotiations: 1, deposit_paid: 2, documentation_ready: 3 };

export function stageLabel(s: string | null | undefined): string {
  return [...STAGES, ...EXITS].find((x) => x.key === s)?.label ?? (s ?? "");
}
export const stageIndex = (s: string) => STAGES.findIndex((x) => x.key === s);

export const OUTCOMES = [
  { key: "pending", label: "Pending" },
  { key: "interested", label: "Interested" },
  { key: "not_interested", label: "Not interested" },
  { key: "wants_second_viewing", label: "Wants second viewing" },
  { key: "made_offer", label: "Made offer" },
] as const;
export const outcomeLabel = (o: string | null | undefined) => OUTCOMES.find((x) => x.key === o)?.label ?? (o ?? "");

export const VIEWING_MODELS = [
  { key: "our_lead_our_property", label: "Our lead + our property" },
  { key: "our_lead_cobroke_property", label: "Our lead + co-broke property" },
  { key: "cobroke_lead_our_property", label: "Co-broke lead + our property" },
  { key: "cobroke_lead_cobroke_property", label: "Co-broke lead + co-broke property" },
  { key: "sourcing_visit", label: "Sourcing visit (no lead)" },
] as const;

/** Today in Colombo as YYYY-MM-DD. */
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(new Date());
}
export function addDays(d: string, n: number): string {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

/** A pending viewing untouched for 2+ days needs a follow-up (6.9). */
export function needsFollowUp(v: { outcome: string; date: string; last_follow_up: string | null }, on = today()): boolean {
  if (v.outcome !== "pending" || v.date > on) return false;
  return daysBetween(v.last_follow_up ?? v.date, on) >= 2;
}

/** wa.me link for a Sri Lankan or international number; null when there's no usable number. */
export function waNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 10) d = `94${d.slice(1)}`;
  if (d.length === 9) d = `94${d}`;
  return d.length >= 8 ? d : null;
}

export const initials = (name: string | null | undefined) =>
  (name ?? "").split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
