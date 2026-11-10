// Client-side preview of the commission engine (SPEC 7.9). The database (app.commission_engine) is the
// source of truth and recomputes on save; this mirrors it so the closing form can show the split live.

export type Model = "company_direct" | "company_via_referrer" | "agent_self_sourced" | "agent_via_referrer";
export interface Rate { schedule_id: string; sourcing_model: Model; tenure: "probation" | "confirmed"; agent_rate: number; referrer_rate: number; axe_rate: number }
export interface Schedule { id: string; version: string; effective_from: string; effective_to: string | null }
export interface AgentHr { agent_id: string; probation_end_date: string | null; commission_exempt: boolean }

export interface SideResult { tenure: "probation" | "confirmed"; exempt: boolean; agentRate: number | null; referrerRate: number | null; axeRate: number | null; agent: number | null; referrer: number | null; axe: number | null }
export interface Split { schedule: Schedule | null; lead: SideResult; listing: SideResult; agentTotal: number; referrerTotal: number; axeTotal: number; delta: number }

export function scheduleFor(schedules: Schedule[], closingDate: string): Schedule | null {
  return schedules
    .filter((s) => s.effective_from <= closingDate && (!s.effective_to || s.effective_to >= closingDate))
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0] ?? null;
}

export function computeSplit(input: {
  closingDate: string; ourCommission: number | null;
  leadModel: Model | null; listingModel: Model | null;
  leadAgentId: string | null; listingAgentId: string | null;
}, schedules: Schedule[], rates: Rate[], hr: AgentHr[]): Split {
  const schedule = scheduleFor(schedules, input.closingDate);
  const base = input.ourCommission ?? 0;
  const side = (model: Model | null, agentId: string | null): SideResult => {
    const h = hr.find((x) => x.agent_id === agentId);
    const tenure = h?.probation_end_date && input.closingDate <= h.probation_end_date ? "probation" : "confirmed";
    const exempt = h?.commission_exempt ?? false;
    const r = schedule && model ? rates.find((x) => x.schedule_id === schedule.id && x.sourcing_model === model && x.tenure === tenure) : undefined;
    if (!r) return { tenure, exempt, agentRate: null, referrerRate: null, axeRate: null, agent: null, referrer: null, axe: null };
    const agentRate = !agentId || exempt ? 0 : Number(r.agent_rate);
    const referrerRate = Number(r.referrer_rate);
    const axeRate = 50 - agentRate - referrerRate;
    const pay = (rate: number) => Math.round((base * rate) / 100);
    return { tenure, exempt, agentRate, referrerRate, axeRate, agent: pay(agentRate), referrer: pay(referrerRate), axe: pay(axeRate) };
  };
  const lead = side(input.leadModel, input.leadAgentId);
  const listing = side(input.listingModel, input.listingAgentId);
  const sum = (a: number | null, b: number | null) => (a ?? 0) + (b ?? 0);
  const agentTotal = sum(lead.agent, listing.agent), referrerTotal = sum(lead.referrer, listing.referrer), axeTotal = sum(lead.axe, listing.axe);
  return { schedule, lead, listing, agentTotal, referrerTotal, axeTotal, delta: base - agentTotal - referrerTotal - axeTotal };
}
