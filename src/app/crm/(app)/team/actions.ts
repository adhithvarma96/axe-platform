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
  const { error: aErr } = await supabase.from("agents").update({
    work_email: s(form, "work_email")?.toLowerCase() ?? null,
    weekly_day_off: dayOff as never,
    public_name: s(form, "public_name"),
    public_whatsapp: s(form, "public_whatsapp"),
  }).eq("id", agentId);
  if (aErr) return { error: aErr.message };

  const hr = { agent_id: agentId, probation_end_date: s(form, "probation_end_date"), date_joined: s(form, "date_joined"), commission_exempt: form.get("commission_exempt") === "on" };
  const { error: hErr } = await supabase.from("agent_hr").upsert(hr, { onConflict: "agent_id" });
  if (hErr) return { error: hErr.message };

  refresh();
  return { ok: true };
}
