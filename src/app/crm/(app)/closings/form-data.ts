import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Model } from "@/lib/commission";
import type { ClosingOptions } from "./closing-form";
import { leadChoices, propertyChoices } from "../choices";

export async function closingOptions(): Promise<ClosingOptions> {
  const s = await createClient();
  const [leads, props, agents, externals, partners, schedules, rates, hr, lc, pc] = await Promise.all([
    s.from("leads").select("lead_code, name, assigned_agent_id, sourcing_model, referral_partner_id").is("deleted_at", null).order("created_at", { ascending: false }).limit(3000),
    s.from("properties").select("listing_no, listing_agent_id, sourcing_model, referral_partner_id, square_feet, development:developments(name), location:locations(name)").is("deleted_at", null).order("seq_no", { ascending: false }).limit(3000),
    s.from("agents").select("id, full_name").is("deleted_at", null).order("full_name"),
    s.from("external_agents").select("id, agent_name").is("deleted_at", null).order("agent_name"),
    s.from("referral_partners").select("id, full_name").is("deleted_at", null).order("full_name"),
    s.from("commission_schedules").select("id, version, effective_from, effective_to").is("deleted_at", null),
    s.from("commission_schedule_rates").select("schedule_id, sourcing_model, tenure, agent_rate, referrer_rate, axe_rate"),
    s.from("agent_hr").select("agent_id, probation_end_date, commission_exempt"),
    leadChoices(),
    propertyChoices(),
  ]);
  return {
    leads: (leads.data ?? []).filter((l) => l.lead_code).map((l) => ({ code: l.lead_code!, label: l.name, agentId: l.assigned_agent_id, model: l.sourcing_model as Model | null, partnerId: l.referral_partner_id })),
    properties: (props.data ?? []).filter((p) => p.listing_no).map((p) => ({
      no: p.listing_no!, label: [p.development?.name, p.location?.name].filter(Boolean).join(" · "),
      agentId: p.listing_agent_id, model: p.sourcing_model as Model | null, partnerId: p.referral_partner_id, sqft: p.square_feet,
    })),
    agents: (agents.data ?? []).map((a) => ({ id: a.id, name: a.full_name })),
    externals: (externals.data ?? []).map((a) => ({ id: a.id, name: a.agent_name })),
    partners: (partners.data ?? []).map((a) => ({ id: a.id, name: a.full_name })),
    schedules: (schedules.data ?? []) as ClosingOptions["schedules"],
    rates: (rates.data ?? []).map((r) => ({ ...r, agent_rate: Number(r.agent_rate), referrer_rate: Number(r.referrer_rate), axe_rate: Number(r.axe_rate) })) as ClosingOptions["rates"],
    hr: (hr.data ?? []) as ClosingOptions["hr"],
    leadChoices: lc,
    propertyChoices: pc,
  };
}
