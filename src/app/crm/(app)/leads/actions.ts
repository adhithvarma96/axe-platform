"use server";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { appUrl, sendEmail } from "@/lib/email";
import { ALL_STAGES, stageLabel, today, type Stage } from "@/lib/crm";

export type FormState = { error?: string; next?: string };
export type MoveResult = { ok?: boolean; error?: string; missing?: string[] };

const s = (f: FormData, k: string) => { const v = String(f.get(k) ?? "").trim(); return v || null; };
const n = (f: FormData, k: string) => { const v = s(f, k); if (v == null) return null; const x = Number(v.replace(/,/g, "")); return Number.isFinite(x) ? x : null; };
const uuids = (f: FormData, k: string) => f.getAll(k).map(String).filter((v) => /^[0-9a-f-]{36}$/.test(v));

function friendly(msg: string): string {
  if (/leads_referrer_required/.test(msg)) return "A via-referrer sourcing model needs a referral partner.";
  if (/row-level security/i.test(msg)) return "You don't have permission to do that.";
  if (/GATE: /.test(msg)) return msg.replace(/^.*GATE: /, "");
  return msg;
}

/** Create or update a lead (SPEC 6.8). New leads start at New or Contacted; later stages go through move_lead. */
export async function saveLead(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const supabase = await createClient();
  const id = s(form, "id");
  const name = s(form, "name");
  if (!name) return { error: "Enter the lead's name." };
  const sourcing = s(form, "sourcing_model");
  const row = {
    name,
    phone: s(form, "phone"), email: s(form, "email")?.toLowerCase() ?? null, company: s(form, "company"),
    profile: s(form, "profile"), nationality_code: s(form, "nationality_code"),
    lead_source_type: s(form, "lead_source_type"), source_channel_id: s(form, "source_channel_id"),
    referring_external_agent_id: s(form, "lead_source_type") === "via_agent" ? s(form, "referring_external_agent_id") : null,
    looking_for: s(form, "looking_for"),
    property_types_wanted: form.getAll("property_types_wanted").map(String),
    bedrooms: n(form, "bedrooms"), occupants: n(form, "occupants"),
    budget_min: n(form, "budget_min"), budget_max: n(form, "budget_max"), budget_currency: s(form, "budget_currency"),
    move_in_date: s(form, "move_in_date"), purchase_timeline: s(form, "purchase_timeline"), financing: s(form, "financing"),
    urgency: s(form, "urgency"),
    assigned_agent_id: s(form, "assigned_agent_id") ?? user.agentId,
    last_contacted: s(form, "last_contacted"),
    detailed_requirements: s(form, "detailed_requirements"), internal_notes: s(form, "internal_notes"),
    linked_owner_id: s(form, "linked_owner_id"),
    sourcing_model: sourcing,
    referral_partner_id: sourcing?.includes("referrer") ? s(form, "referral_partner_id") : null,
  };
  if (!row.assigned_agent_id) return { error: "Choose the agent this lead is assigned to." };
  if (row.sourcing_model?.includes("referrer") && !row.referral_partner_id) return { error: "A via-referrer sourcing model needs a referral partner." };

  let leadId = id, code: string | null = null;
  if (id) {
    const { data, error } = await supabase.from("leads").update(row as never).eq("id", id).select("id, lead_code").maybeSingle();
    if (error) return { error: friendly(error.message) };
    if (!data) return { error: "You don't have permission to edit this lead." };
    code = data.lead_code;
  } else {
    const start = s(form, "pipeline_status") === "contacted" ? "contacted" : "new";
    const { data, error } = await supabase.from("leads").insert({ ...row, pipeline_status: start } as never).select("id, lead_code").single();
    if (error) return { error: friendly(error.message) };
    leadId = data.id; code = data.lead_code;
  }

  // preferred areas, buildings and must-have features
  for (const [table, col, field] of [
    ["lead_preferred_locations", "location_id", "location_ids"],
    ["lead_preferred_developments", "development_id", "development_ids"],
    ["lead_features_wanted", "feature_id", "feature_ids"],
  ] as const) {
    await supabase.from(table).delete().eq("lead_id", leadId!);
    const ids = uuids(form, field);
    if (ids.length) {
      const { error } = await supabase.from(table).insert(ids.map((x) => ({ lead_id: leadId!, [col]: x })) as never);
      if (error) return { error: friendly(error.message) };
    }
  }
  return { next: `/leads/${code ?? leadId}` };
}

/** Move a lead through the pipeline. The database checks the gates; a blocked try emails Adhith + the agent. */
export async function moveLead(leadId: string, to: string, lostReasonId?: string | null, overrideReason?: string | null): Promise<MoveResult> {
  const user = await requireUser();
  if (!ALL_STAGES.includes(to as Stage)) return { error: "Unknown stage." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("move_lead", {
    p_lead: leadId, p_to: to as Stage, p_lost_reason: lostReasonId || undefined, p_override_reason: overrideReason || undefined,
  });
  if (error) return { error: friendly(error.message) };
  const r = data as { ok: boolean; error?: string; missing?: string[] };
  if (!r.ok && r.missing?.length) {
    // SPEC 7.8: every blocked attempt reaches the founder, CC the agent's work email
    const { data: lead } = await supabase.from("leads").select("lead_code, name, agent:agents!leads_assigned_agent_id_fkey(work_email)").eq("id", leadId).maybeSingle();
    const { data: admins } = await supabase.from("agents").select("work_email").eq("role", "super_admin").eq("status", "active");
    await sendEmail({
      to: (admins ?? []).map((a) => a.work_email ?? "").filter(Boolean),
      cc: [lead?.agent?.work_email ?? "", user.email ?? ""],
      subject: `Gate blocked: ${lead?.lead_code ?? "lead"} → ${stageLabel(to)}`,
      text: `${user.fullName ?? "Someone"} tried to move ${lead?.name ?? "a lead"} (${lead?.lead_code ?? ""}) to ${stageLabel(to)}.\n\nStill missing:\n- ${r.missing.join("\n- ")}\n\nOpen: ${appUrl()}/leads/${lead?.lead_code ?? leadId}`,
    });
    return { ok: false, missing: r.missing };
  }
  if (!r.ok) return { error: r.error ?? "Couldn't move the lead." };
  refresh();
  return { ok: true };
}

/** Tick a gate item. Ticks are sticky; a Super Admin can untick (reset a recycled lead). */
export async function setGate(leadId: string, key: string, ticked: boolean): Promise<MoveResult> {
  const user = await requireUser();
  const supabase = await createClient();
  if (ticked) {
    const { error } = await supabase.from("lead_gate_ticks").insert({ lead_id: leadId, gate_item_key: key });
    if (error && !/duplicate/i.test(error.message)) return { error: friendly(error.message) };
  } else {
    if (user.role !== "super_admin") return { error: "Gate items stay ticked. Ask a Super Admin to reset the checklist." };
    const { error } = await supabase.from("lead_gate_ticks").delete().eq("lead_id", leadId).eq("gate_item_key", key);
    if (error) return { error: friendly(error.message) };
  }
  refresh();
  return { ok: true };
}

/** Quick-log a call, WhatsApp, email, meeting or note; also stamps "last contacted". */
export async function logActivity(leadId: string, type: string, summary: string): Promise<MoveResult> {
  const user = await requireUser();
  if (!summary.trim()) return { error: "Write a short note first." };
  const supabase = await createClient();
  const { error } = await supabase.from("activities").insert({ lead_id: leadId, type: type as never, summary: summary.trim(), by_agent_id: user.agentId });
  if (error) return { error: friendly(error.message) };
  if (type !== "note") await supabase.from("leads").update({ last_contacted: today() }).eq("id", leadId);
  refresh();
  return { ok: true };
}

export async function setTaskDone(taskId: string, done: boolean): Promise<MoveResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ status: done ? "done" : "open", completed_at: done ? new Date().toISOString() : null }).eq("id", taskId);
  if (error) return { error: friendly(error.message) };
  refresh();
  return { ok: true };
}

export async function addTask(leadId: string, title: string, dueOn: string | null): Promise<MoveResult> {
  const user = await requireUser();
  if (!title.trim()) return { error: "Describe the task." };
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("assigned_agent_id").eq("id", leadId).maybeSingle();
  const { error } = await supabase.from("tasks").insert({ title: title.trim(), due_on: dueOn || today(), lead_id: leadId, assignee_agent_id: lead?.assigned_agent_id ?? user.agentId });
  if (error) return { error: friendly(error.message) };
  refresh();
  return { ok: true };
}
