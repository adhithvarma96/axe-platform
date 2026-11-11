"use server";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PartyState } from "../party-form";

const OK = ["prospect", "assessment_booked", "mandate_won", "lost"] as const;
const TYPES = ["individual", "corporate", "developer", "bank", "unknown_via_agent"];
const PROTOCOLS = ["direct_call_ok", "introduce_via_whatsapp_first", "route_through_adhith"];
const s = (f: FormData, k: string) => { const v = String(f.get(k) ?? "").trim(); return v || null; };
const friendly = (m: string) => (/row-level/i.test(m) ? "You don't have permission to do that." : m);
const digits = (p: string | null) => (p ?? "").replace(/\D/g, "").slice(-9);

/** Owner mandate lifecycle (SPEC 8.3): Prospect -> Assessment booked -> Mandate won / Lost. */
export async function setMandate(id: string, status: string): Promise<{ error?: string }> {
  await requireUser();
  const value = (OK as readonly string[]).includes(status) ? (status as (typeof OK)[number]) : null;
  const supabase = await createClient();
  const { error } = await supabase.from("owners").update({ mandate_status: value }).eq("id", id);
  if (error) return { error: friendly(error.message) };
  refresh();
  return {};
}

/** An existing owner with the same phone (last 9 digits) or email, if any. */
async function duplicateOf(phone: string | null, email: string | null, exceptId?: string | null) {
  const supabase = await createClient();
  const ors: string[] = [];
  if (email) ors.push(`email.ilike.${email.replace(/[,()]/g, "")}`);
  const d = digits(phone);
  if (d.length >= 7) ors.push(`primary_phone.ilike.%${d}%`, `whatsapp.ilike.%${d}%`);
  if (!ors.length) return null;
  let q = supabase.from("owners").select("id, name").is("deleted_at", null).or(ors.join(",")).limit(1);
  if (exceptId) q = q.neq("id", exceptId);
  return (await q).data?.[0] ?? null;
}

function ownerRow(form: FormData) {
  const type = s(form, "owner_type"), protocol = s(form, "contact_protocol"), mandate = s(form, "mandate_status");
  return {
    name: s(form, "name") ?? "",
    owner_type: (type && TYPES.includes(type) ? type : null) as never,
    primary_phone: s(form, "primary_phone"), whatsapp: s(form, "whatsapp"), email: s(form, "email")?.toLowerCase() ?? null,
    contact_protocol: (protocol && PROTOCOLS.includes(protocol) ? protocol : null) as never,
    mandate_status: (mandate && (OK as readonly string[]).includes(mandate) ? mandate : null) as never,
    contact_notes: s(form, "contact_notes"), address: s(form, "address"), notes: s(form, "notes"),
  };
}

/** Add or edit an owner from the full form. A matching phone or email stops a duplicate unless confirmed. */
export async function saveOwner(_prev: PartyState, form: FormData): Promise<PartyState> {
  const user = await requireUser();
  const id = s(form, "id");
  const row = ownerRow(form);
  if (!row.name) return { error: "Enter the owner's name." };
  if (form.get("confirm_duplicate") !== "1") {
    const dup = await duplicateOf(row.primary_phone ?? row.whatsapp, row.email, id);
    if (dup) return { error: `${dup.name} already has this phone or email. Open them instead, or tick "Save anyway" below and save again.`, duplicate: dup } as PartyState;
  }
  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("owners").update(row).eq("id", id);
    if (error) return { error: friendly(error.message) };
    redirect(`/owners/${id}`);
  }
  const { data, error } = await supabase.from("owners").insert({ ...row, sourced_by_agent_id: user.agentId }).select("id").single();
  if (error) return { error: friendly(error.message) };
  redirect(`/owners/${data.id}`);
}

/** Quick add from the property form: name, phone, email. Returns an existing match instead of duplicating. */
export async function quickOwner(input: { name: string; phone: string; email: string }): Promise<{ error?: string; owner?: { id: string; name: string; hint?: string }; existing?: boolean }> {
  const user = await requireUser();
  const name = input.name.trim(), phone = input.phone.trim() || null, email = input.email.trim().toLowerCase() || null;
  if (!name) return { error: "Enter the owner's name." };
  const dup = await duplicateOf(phone, email);
  if (dup) return { owner: { id: dup.id, name: dup.name }, existing: true };
  const supabase = await createClient();
  const { data, error } = await supabase.from("owners").insert({ name, primary_phone: phone, email, mandate_status: "mandate_won", sourced_by_agent_id: user.agentId }).select("id, name").single();
  if (error) return { error: friendly(error.message) };
  return { owner: { id: data.id, name: data.name, hint: [phone, email].filter(Boolean).join(" · ") || undefined } };
}
