"use server";
import { headers } from "next/headers";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

export type MemberState = { ok?: boolean; error?: string; link?: string; emailed?: boolean; name?: string };
const s = (f: FormData, k: string) => { const v = String(f.get(k) ?? "").trim(); return v || null; };
const ROLES = ["agent", "sales_manager", "data_entry", "super_admin"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") || host?.includes(".localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * A one-time sign-in link that lands on "set your password". New people get an invite;
 * people who already have a login get a password link. The agent row is linked to the login here.
 * Uses the service key for the Auth admin API only, and only for a Super Admin who has passed 2FA.
 */
async function loginLink(agentId: string): Promise<MemberState> {
  const supabase = await createClient();
  const { data: a } = await supabase.from("agents").select("id, full_name, work_email, user_id, status").eq("id", agentId).maybeSingle();
  if (!a) return { error: "Team member not found." };
  if (a.status !== "active") return { error: "Reactivate them first." };
  const admin = createAdminClient();
  let email = a.work_email;
  if (a.user_id) email = (await admin.auth.admin.getUserById(a.user_id)).data.user?.email ?? email;
  if (!email) return { error: "Add their work email first (Working details)." };

  let type: "invite" | "recovery" = a.user_id ? "recovery" : "invite";
  let res = await admin.auth.admin.generateLink({ type, email });
  if (res.error && type === "invite" && /already|registered|exists/i.test(res.error.message)) {
    type = "recovery";
    res = await admin.auth.admin.generateLink({ type, email });
  }
  if (res.error || !res.data.properties?.hashed_token) return { error: res.error?.message ?? "Couldn't create the link." };
  const userId = res.data.user?.id;
  if (userId && userId !== a.user_id) {
    const { data: taken } = await supabase.from("agents").select("full_name").eq("user_id", userId).neq("id", a.id).maybeSingle();
    if (taken) return { error: `That email's login already belongs to ${taken.full_name}.` };
    const { error } = await supabase.from("agents").update({ user_id: userId }).eq("id", a.id);
    if (error) return { error: error.message };
  }
  const link = `${await origin()}/auth/confirm/?token_hash=${encodeURIComponent(res.data.properties.hashed_token)}&type=${type}&next=/reset-password/`;
  const emailed = await sendEmail({
    to: [email],
    subject: "Your Axe Realty OS login",
    text: `Hi ${a.full_name.split(" ")[0]},\n\nOpen this link to set your password for Axe Realty OS:\n${link}\n\nThe link works once and expires in 24 hours.\n\nAxe Realty`,
  });
  return { ok: true, link, emailed, name: a.full_name };
}

async function superAdmin() {
  const user = await requireUser();
  return user.role === "super_admin" ? user : null;
}

export async function addMember(_prev: MemberState, form: FormData): Promise<MemberState> {
  if (!(await superAdmin())) return { error: "Only the Super Admin can add team members." };
  const full_name = s(form, "full_name");
  const work_email = s(form, "work_email")?.toLowerCase() ?? null;
  const role = s(form, "role") ?? "agent";
  if (!full_name) return { error: "Enter their name." };
  if (!work_email || !EMAIL.test(work_email)) return { error: "Enter a valid work email; it becomes their login." };
  if (!ROLES.includes(role)) return { error: "Pick a role." };
  const supabase = await createClient();
  const { data: a, error } = await supabase.from("agents").insert({
    full_name, work_email, role: role as never, status: "active", weekly_day_off: s(form, "weekly_day_off") as never,
  }).select("id").single();
  if (error) return { error: /agents_work_email_key|duplicate/.test(error.message) ? "Someone on the team already has that work email." : error.message };
  const { error: hErr } = await supabase.from("agent_hr").upsert({
    agent_id: a.id, date_joined: s(form, "date_joined"), probation_end_date: s(form, "probation_end_date"), personal_phone: s(form, "personal_phone"),
  }, { onConflict: "agent_id" });
  if (hErr) return { error: hErr.message };
  const res = await loginLink(a.id);
  refresh();
  return res.error ? { ok: true, name: full_name, error: `Added, but the login link failed: ${res.error}` } : res;
}

export async function sendLoginLink(agentId: string): Promise<MemberState> {
  if (!(await superAdmin())) return { error: "Only the Super Admin can do this." };
  const res = await loginLink(agentId);
  refresh();
  return res;
}

export async function setMemberStatus(agentId: string, active: boolean): Promise<MemberState> {
  const me = await superAdmin();
  if (!me) return { error: "Only the Super Admin can do this." };
  if (agentId === me.agentId && !active) return { error: "You can't deactivate yourself." };
  const supabase = await createClient();
  const { error } = await supabase.from("agents").update({ status: active ? "active" : "inactive" }).eq("id", agentId);
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}
