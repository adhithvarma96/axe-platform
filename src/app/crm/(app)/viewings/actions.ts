"use server";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { today } from "@/lib/crm";

export type FormState = { error?: string; next?: string };
const s = (f: FormData, k: string) => { const v = String(f.get(k) ?? "").trim(); return v || null; };

function friendly(msg: string) {
  if (/row-level security/i.test(msg)) return "You don't have permission to do that.";
  return msg;
}

/** Log or edit a viewing (SPEC 9.5). The lead's stage follows the outcome in the database (7.4). */
export async function saveViewing(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const supabase = await createClient();
  const id = s(form, "id");
  const model = s(form, "viewing_model");

  // property: "AX260326 – Cinnamon Life" -> AX260326
  const propText = s(form, "property");
  let propertyId: string | null = null;
  if (propText) {
    const no = propText.split(/\s/)[0].toUpperCase();
    const { data } = await supabase.from("properties").select("id").eq("listing_no", no).is("deleted_at", null).maybeSingle();
    if (!data) return { error: `No property with listing no ${no}. Pick one from the list.` };
    propertyId = data.id;
  }

  // lead: an existing ARLD code, or a new one typed inline
  let leadId: string | null = null;
  const leadText = s(form, "lead");
  const newName = s(form, "new_lead_name");
  if (newName) {
    const { data, error } = await supabase.from("leads").insert({
      name: newName, phone: s(form, "new_lead_phone"), assigned_agent_id: user.agentId, pipeline_status: "contacted", looking_for: "rent",
    }).select("id").single();
    if (error) return { error: friendly(error.message) };
    leadId = data.id;
  } else if (leadText) {
    const code = leadText.split(/\s/)[0].toUpperCase();
    const { data } = await supabase.from("leads").select("id").eq("lead_code", code).is("deleted_at", null).maybeSingle();
    if (!data) return { error: `No lead ${code}. Pick one from the list, or add a new lead.` };
    leadId = data.id;
  }
  if (model !== "sourcing_visit" && !leadId) return { error: "Choose the lead (or mark it a sourcing visit)." };
  if (!propertyId) return { error: "Choose the property." };

  const row = {
    date: s(form, "date") ?? today(), time: s(form, "time"),
    lead_id: model === "sourcing_visit" ? null : leadId, property_id: propertyId,
    outcome: (s(form, "outcome") ?? "pending") as never,
    conducted_by_agent_id: s(form, "conducted_by_agent_id") ?? user.agentId,
    viewing_model: model as never, co_broke_external_agent_id: s(form, "co_broke_external_agent_id"),
    landlord_present: form.get("landlord_present") === "on", feedback_notes: s(form, "feedback_notes"),
  };
  if (id) {
    const { data, error } = await supabase.from("viewings").update(row).eq("id", id).select("viewing_no").maybeSingle();
    if (error) return { error: friendly(error.message) };
    if (!data) return { error: "You don't have permission to edit this viewing." };
    return { next: `/viewings/${data.viewing_no}` };
  }
  const { data, error } = await supabase.from("viewings").insert(row).select("viewing_no").single();
  if (error) return { error: friendly(error.message) };
  return { next: `/viewings/${data.viewing_no}` };
}

export async function setOutcome(viewingId: string, outcome: string): Promise<{ error?: string }> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("viewings").update({ outcome: outcome as never, last_follow_up: today() }).eq("id", viewingId);
  if (error) return { error: friendly(error.message) };
  refresh();
  return {};
}

/** "I followed up" — resets the 2-day follow-up clock without changing the outcome. */
export async function followedUp(viewingId: string): Promise<{ error?: string }> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("viewings").update({ last_follow_up: today() }).eq("id", viewingId);
  if (error) return { error: friendly(error.message) };
  refresh();
  return {};
}
