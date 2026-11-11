"use server";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays, today } from "@/lib/crm";
import { METRICS } from "@/lib/revenue";

export type TeamState = { ok?: boolean; error?: string };
const s = (f: FormData, k: string) => { const v = String(f.get(k) ?? "").trim(); return v || null; };
const num = (f: FormData, k: string) => { const v = s(f, k); if (v == null) return null; const x = Number(v.replace(/,/g, "")); return Number.isFinite(x) && x >= 0 ? x : NaN; };

/**
 * Saves one agent's targets and working details. A changed target closes the old row
 * (effective until yesterday) and opens a new one from today, so past months keep the
 * target they were measured against. The first target ever set starts on the 1st of the month.
 */
export async function saveAgent(_prev: TeamState, form: FormData): Promise<TeamState> {
  const user = await requireUser();
  if (user.role !== "super_admin") return { error: "Only the Super Admin can change targets." };
  const agentId = s(form, "agent_id");
  if (!agentId) return { error: "Missing agent." };
  const supabase = await createClient();
  const on = today();

  const { data: current, error: readErr } = await supabase.from("agent_targets").select("id, metric, target_value, effective_from")
    .eq("agent_id", agentId).is("deleted_at", null).lte("effective_from", on).or(`effective_to.is.null,effective_to.gte.${on}`);
  if (readErr) return { error: readErr.message };

  for (const m of METRICS) {
    const value = num(form, m.key);
    if (Number.isNaN(value)) return { error: `${m.label}: enter a number.` };
    const cur = (current ?? []).find((t) => t.metric === m.key);
    if (cur && value != null && Number(cur.target_value) === value) continue;
    if (!cur && value == null) continue;
    if (cur) {
      const r = cur.effective_from >= on
        ? (value == null ? await supabase.from("agent_targets").update({ deleted_at: new Date().toISOString() }).eq("id", cur.id)
                         : await supabase.from("agent_targets").update({ target_value: value }).eq("id", cur.id))
        : await supabase.from("agent_targets").update({ effective_to: addDays(on, -1) }).eq("id", cur.id);
      if (r.error) return { error: r.error.message };
      if (cur.effective_from >= on) continue;
    }
    if (value != null) {
      const { error } = await supabase.from("agent_targets").insert({
        agent_id: agentId, metric: m.key, period: m.period, target_value: value, effective_from: cur ? on : `${on.slice(0, 7)}-01`,
      });
      if (error) return { error: error.message };
    }
  }

  const dayOff = s(form, "weekly_day_off");
  const fullName = s(form, "full_name");
  const role = s(form, "role");
  if (role && !["agent", "sales_manager", "data_entry", "super_admin"].includes(role)) return { error: "Pick a role." };
  if (agentId === user.agentId && role && role !== "super_admin") return { error: "You can't change your own role." };
  const { error: aErr } = await supabase.from("agents").update({
    ...(fullName ? { full_name: fullName } : {}),
    ...(role ? { role: role as never } : {}),
    work_email: s(form, "work_email")?.toLowerCase() ?? null,
    weekly_day_off: dayOff as never,
    public_name: s(form, "public_name"),
    public_whatsapp: s(form, "public_whatsapp"),
    public_title: s(form, "public_title"),
    public_bio: s(form, "public_bio"),
    public_email: s(form, "public_email")?.toLowerCase() ?? null,
    show_on_website: form.get("show_on_website") === "on",
    website_sort: Number(s(form, "website_sort") ?? 100) || 100,
  }).eq("id", agentId);
  if (aErr) return { error: aErr.message };

  const hr = { agent_id: agentId, personal_phone: s(form, "personal_phone"), probation_end_date: s(form, "probation_end_date"), date_joined: s(form, "date_joined"), commission_exempt: form.get("commission_exempt") === "on" };
  const { error: hErr } = await supabase.from("agent_hr").upsert(hr, { onConflict: "agent_id" });
  if (hErr) return { error: hErr.message };

  refresh();
  return { ok: true };
}

/** The company's monthly revenue target. A change closes the old figure yesterday and starts the new one today. */
export async function saveCompanyTarget(_prev: TeamState, form: FormData): Promise<TeamState> {
  const user = await requireUser();
  if (user.role !== "super_admin") return { error: "Only the Super Admin can change the company target." };
  const value = num(form, "company_revenue");
  if (value == null || Number.isNaN(value)) return { error: "Enter the monthly target in LKR." };
  const supabase = await createClient();
  const on = today();
  const { data: cur } = await supabase.from("company_targets").select("id, target_value, effective_from").is("deleted_at", null)
    .lte("effective_from", on).or(`effective_to.is.null,effective_to.gte.${on}`).order("effective_from", { ascending: false }).limit(1);
  const c = cur?.[0];
  if (c && Number(c.target_value) === value) return { ok: true };
  if (c && c.effective_from >= on) {
    const { error } = await supabase.from("company_targets").update({ target_value: value }).eq("id", c.id);
    if (error) return { error: error.message };
  } else {
    if (c) {
      const { error } = await supabase.from("company_targets").update({ effective_to: addDays(on, -1) }).eq("id", c.id);
      if (error) return { error: error.message };
    }
    const { error } = await supabase.from("company_targets").insert({ target_value: value, effective_from: c ? on : `${on.slice(0, 7)}-01` });
    if (error) return { error: error.message };
  }
  refresh();
  return { ok: true };
}
