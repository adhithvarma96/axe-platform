"use server";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type PromoteTarget = "lead" | "owner" | "external_agent" | "referral_partner";
export type PromoteResult = { ok?: boolean; error?: string; href?: string };

const friendly = (m: string) => (/row-level security/i.test(m) ? "You don't have permission to do that." : m);

/**
 * Promotes a marketing lead after a real conversation (SPEC 8.5) into exactly one record,
 * pre-filled from the marketing lead. An existing lead or owner with the same email is
 * linked instead of duplicated.
 */
export async function promote(id: string, target: PromoteTarget): Promise<PromoteResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: m, error } = await supabase.from("marketing_leads").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) return { error: friendly(error.message) };
  if (!m) return { error: "Marketing lead not found." };
  if (m.status === "promoted") return { error: "Already promoted." };
  const name = m.name?.trim() || m.email.split("@")[0];
  const email = m.email.toLowerCase();

  let link: Record<string, string> = {};
  let href = "";
  if (target === "lead") {
    const { data: existing } = await supabase.from("leads").select("id, lead_code").ilike("email", email).is("deleted_at", null).limit(1).maybeSingle();
    let lead = existing;
    if (!lead) {
      const r = await supabase.from("leads").insert({
        name, email, phone: m.whatsapp, assigned_agent_id: user.agentId, pipeline_status: "new",
        looking_for: m.audience_type === "tenant" ? "rent" : m.audience_type === "buyer_investor" ? "buy" : null,
        detailed_requirements: m.development_or_area ? `Interested in: ${m.development_or_area}` : null,
        internal_notes: m.notes, utm_source: m.utm_source, utm_medium: m.utm_medium, utm_campaign: m.utm_campaign, fbclid: m.fbclid,
      }).select("id, lead_code").single();
      if (r.error) return { error: friendly(r.error.message) };
      lead = r.data;
    }
    link = { promoted_to_lead_id: lead.id };
    href = existing ? `/leads/${lead.lead_code}` : `/leads/${lead.lead_code}/edit`;
  } else if (target === "owner") {
    const { data: existing } = await supabase.from("owners").select("id").ilike("email", email).is("deleted_at", null).limit(1).maybeSingle();
    let ownerId = existing?.id;
    if (!ownerId) {
      const r = await supabase.from("owners").insert({ name, email, whatsapp: m.whatsapp, primary_phone: m.whatsapp, mandate_status: "prospect", sourced_by_agent_id: user.agentId, notes: [m.development_or_area && `Owns in: ${m.development_or_area}`, m.notes].filter(Boolean).join("\n") || null }).select("id").single();
      if (r.error) return { error: friendly(r.error.message) };
      ownerId = r.data.id;
    }
    link = { promoted_to_owner_id: ownerId };
    href = `/owners/${ownerId}`;
  } else if (target === "external_agent") {
    const r = await supabase.from("external_agents").insert({ agent_name: name, email, whatsapp: m.whatsapp, phone: m.whatsapp, notes: m.notes }).select("id").single();
    if (r.error) return { error: friendly(r.error.message) };
    link = { promoted_to_external_agent_id: r.data.id };
    href = `/external-agents/${r.data.id}`;
  } else if (target === "referral_partner") {
    const r = await supabase.from("referral_partners").insert({ full_name: name, email, phone: m.whatsapp, registered_at: new Date().toISOString(), attributed_to_agent_id: user.agentId, notes: m.notes }).select("id").single();
    if (r.error) return { error: friendly(r.error.message) };
    link = { promoted_to_referral_partner_id: r.data.id };
    href = `/referral-partners/${r.data.id}`;
  } else return { error: "Unknown target." };

  const { error: uErr } = await supabase.from("marketing_leads").update({ ...link, status: "promoted" }).eq("id", id);
  if (uErr) return { error: friendly(uErr.message) };
  refresh();
  return { ok: true, href };
}

export async function setMarketingStatus(id: string, status: "new" | "nurturing" | "engaged" | "disqualified" | "unsubscribed"): Promise<PromoteResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("marketing_leads").update({ status }).eq("id", id).neq("status", "promoted");
  if (error) return { error: friendly(error.message) };
  refresh();
  return { ok: true };
}

export async function saveMarketingNotes(id: string, notes: string): Promise<PromoteResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("marketing_leads").update({ notes: notes.trim() || null }).eq("id", id);
  if (error) return { error: friendly(error.message) };
  refresh();
  return { ok: true };
}
