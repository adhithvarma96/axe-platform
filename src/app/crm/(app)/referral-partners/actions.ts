"use server";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PartyState } from "../party-form";

const s = (f: FormData, k: string) => { const v = String(f.get(k) ?? "").trim(); return v || null; };
const friendly = (m: string) => (/row-level security/i.test(m) ? "You don't have permission to do that." : /referral_rate_pct/.test(m) ? "The referral rate must be between 0 and 15%." : m);

export async function saveReferralPartner(_prev: PartyState, form: FormData): Promise<PartyState> {
  const user = await requireUser();
  const supabase = await createClient();
  const id = s(form, "id");
  const full_name = s(form, "full_name");
  if (!full_name) return { error: "Enter the partner's name." };
  const rate = s(form, "referral_rate_pct");
  const row = {
    full_name, phone: s(form, "phone"), email: s(form, "email")?.toLowerCase() ?? null,
    company_organization: s(form, "company_organization"), referrer_category_id: s(form, "referrer_category_id"),
    attribution: s(form, "attribution") as "company_referrer" | "agent_personal_referrer" | null,
    attributed_to_agent_id: s(form, "attributed_to_agent_id"), address: s(form, "address"),
    agreement_signed_on: s(form, "agreement_signed_on"), agreement_valid_until: s(form, "agreement_valid_until"),
    referral_rate_pct: rate == null ? 15 : Number(rate), notes: s(form, "notes"),
  };
  if (row.agreement_signed_on && row.agreement_valid_until && row.agreement_valid_until < row.agreement_signed_on) return { error: "The agreement can't end before it was signed." };

  let partnerId = id;
  if (id) {
    const { error } = await supabase.from("referral_partners").update(row).eq("id", id);
    if (error) return { error: friendly(error.message) };
  } else {
    const { data, error } = await supabase.from("referral_partners").insert({ ...row, registered_at: new Date().toISOString() }).select("id").single();
    if (error) return { error: friendly(error.message) };
    partnerId = data.id;
  }
  // NIC (needed for the agreement) lives in a Super-Admin-only table.
  if (user.role === "super_admin" && form.has("nic_number")) {
    const { error } = await supabase.from("referral_partner_private").upsert({ referral_partner_id: partnerId!, nic_number: s(form, "nic_number") }, { onConflict: "referral_partner_id" });
    if (error) return { error: friendly(error.message) };
  }
  if (!id) redirect(`/referral-partners/${partnerId}`);
  refresh();
  return { ok: true };
}
