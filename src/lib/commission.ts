// Client-side preview of the commission engine (SPEC 7.9). The database (app.commission_engine) is the
// source of truth and recomputes on save; this mirrors it so the closing form can show the split live.
//
// Each side (lead = tenant / buyer, listing = landlord / seller) is worked out on its own commission.
// Schedule A rates are points out of 50 per side (50 points = 100% of that side's commission).
// A referral fee is the partner's own % of the referred side's commission, out of Axe's share.

export type Model = "company_direct" | "company_via_referrer" | "agent_self_sourced" | "agent_via_referrer";
export interface Rate { schedule_id: string; sourcing_model: Model; tenure: "probation" | "confirmed"; agent_rate: number; referrer_rate: number; axe_rate: number }
export interface Schedule { id: string; version: string; effective_from: string; effective_to: string | null }
export interface AgentHr { agent_id: string; probation_end_date: string | null; commission_exempt: boolean }

export interface SideResult {
  tenure: "probation" | "confirmed"; exempt: boolean; base: number;
  agentRate: number | null; referrerRate: number | null; axeRate: number | null; // points out of 50
  agent: number | null; referrer: number | null; axe: number | null;
}
export interface Split { schedule: Schedule | null; lead: SideResult; listing: SideResult; total: number; agentTotal: number; referrerTotal: number; axeTotal: number; delta: number }

/** Points out of a side's 50 -> % of that side's commission. */
export const sidePct = (points: number | null) => (points == null ? null : Math.round(points * 2 * 100) / 100);

export function scheduleFor(schedules: Schedule[], closingDate: string): Schedule | null {
  return schedules
    .filter((s) => s.effective_from <= closingDate && (!s.effective_to || s.effective_to >= closingDate))
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0] ?? null;
}

export function computeSplit(input: {
  closingDate: string;
  leadCommission: number | null; listingCommission: number | null;
  leadModel: Model | null; listingModel: Model | null;
  leadAgentId: string | null; listingAgentId: string | null;
  /** referral fee as % of the side's commission (the partner's rate, or the rate fixed on the closing) */
  leadReferralPct: number | null; listingReferralPct: number | null;
}, schedules: Schedule[], rates: Rate[], hr: AgentHr[]): Split {
  const schedule = scheduleFor(schedules, input.closingDate);
  const side = (base: number, model: Model | null, agentId: string | null, refPct: number | null): SideResult => {
    const h = hr.find((x) => x.agent_id === agentId);
    const tenure = h?.probation_end_date && input.closingDate <= h.probation_end_date ? "probation" : "confirmed";
    const exempt = h?.commission_exempt ?? false;
    const r = schedule && model ? rates.find((x) => x.schedule_id === schedule.id && x.sourcing_model === model && x.tenure === tenure) : undefined;
    if (!r) return { tenure, exempt, base, agentRate: null, referrerRate: null, axeRate: null, agent: null, referrer: null, axe: null };
    const agentRate = !agentId || exempt ? 0 : Number(r.agent_rate);
    const referrerRate = Number(r.referrer_rate) === 0 ? 0 : (refPct ?? 15) / 2;
    const axeRate = 50 - agentRate - referrerRate;
    const agent = Math.round((base * agentRate) / 50);
    const referrer = Math.round((base * referrerRate) / 50);
    return { tenure, exempt, base, agentRate, referrerRate, axeRate, agent, referrer, axe: base - agent - referrer };
  };
  const leadBase = input.leadCommission ?? 0, listBase = input.listingCommission ?? 0;
  const lead = side(leadBase, input.leadModel, input.leadAgentId, input.leadReferralPct);
  const listing = side(listBase, input.listingModel, input.listingAgentId, input.listingReferralPct);
  const sum = (a: number | null, b: number | null) => (a ?? 0) + (b ?? 0);
  const total = leadBase + listBase;
  const agentTotal = sum(lead.agent, listing.agent), referrerTotal = sum(lead.referrer, listing.referrer), axeTotal = sum(lead.axe, listing.axe);
  return { schedule, lead, listing, total, agentTotal, referrerTotal, axeTotal, delta: total - agentTotal - referrerTotal - axeTotal };
}
