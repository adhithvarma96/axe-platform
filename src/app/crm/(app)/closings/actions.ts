"use server";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { today } from "@/lib/crm";

export type FormState = { error?: string; next?: string };
const s = (f: FormData, k: string) => { const v = String(f.get(k) ?? "").trim(); return v || null; };
const n = (f: FormData, k: string) => { const v = s(f, k); if (v == null) return null; const x = Number(v.replace(/,/g, "")); return Number.isFinite(x) ? x : null; };

async function admin() {
  const user = await requireUser();
  if (user.role !== "super_admin") throw new Error("Only a Super Admin can do that.");
  return user;
}

/** Log or edit a closing (SPEC 8.7). The engine in the database computes and checks the split on save. */
export async function saveClosing(_prev: FormState, form: FormData): Promise<FormState> {
  try { await admin(); } catch (e) { return { error: (e as Error).message }; }
  const supabase = await createClient();
  const id = s(form, "id");

  const leadCode = s(form, "lead")?.split(/\s/)[0].toUpperCase() ?? null;
  const listingNo = s(form, "property")?.split(/\s/)[0].toUpperCase() ?? null;
  const lead = leadCode ? (await supabase.from("leads").select("id").eq("lead_code", leadCode).maybeSingle()).data : null;
  const prop = listingNo ? (await supabase.from("properties").select("id").eq("listing_no", listingNo).maybeSingle()).data : null;
  if (leadCode && !lead) return { error: `No lead ${leadCode}.` };
  if (listingNo && !prop) return { error: `No property ${listingNo}.` };

  const row = {
    closing_date: s(form, "closing_date") ?? today(),
    deal_type: s(form, "deal_type") as never,
    lead_id: lead?.id ?? null, property_id: prop?.id ?? null,
    lead_side_agent_id: s(form, "lead_side_agent_id"), listing_side_agent_id: s(form, "listing_side_agent_id"),
    closing_agent_id: s(form, "lead_side_agent_id") ?? s(form, "listing_side_agent_id"),
    lead_sourcing_model: s(form, "lead_sourcing_model") as never, listing_sourcing_model: s(form, "listing_sourcing_model") as never,
    monthly_rent: n(form, "monthly_rent"), total_deal_value: n(form, "total_deal_value"), deal_currency: s(form, "deal_currency") as never,
    usd_lkr_rate: n(form, "usd_lkr_rate"),
    lease_start_date: s(form, "lease_start_date"), lease_end_date: s(form, "lease_end_date"),
    rent_advance_months: n(form, "rent_advance_months"), security_deposit_months: n(form, "security_deposit_months"),
    gross_commission: n(form, "gross_commission"),
    lead_side_commission: n(form, "lead_side_commission"), listing_side_commission: n(form, "listing_side_commission"),
    our_commission: (n(form, "lead_side_commission") ?? 0) + (n(form, "listing_side_commission") ?? 0), commission_currency: s(form, "commission_currency") as never,
    co_broke_external_agent_id: s(form, "co_broke_external_agent_id"), co_broke_split_pct: n(form, "co_broke_split_pct"),
    lead_side_referral_partner_id: s(form, "lead_side_referral_partner_id"), listing_side_referral_partner_id: s(form, "listing_side_referral_partner_id"),
    split_override_reason: s(form, "split_override_reason"), notes: s(form, "notes"),
  };
  if (!row.deal_type) return { error: "Choose the deal type." };
  if ((row.lead_side_commission == null && row.listing_side_commission == null) || !row.commission_currency) return { error: "Enter our commission from the landlord and/or tenant side, and its currency." };

  const q = id
    ? supabase.from("closings").update(row).eq("id", id).select("closing_no").maybeSingle()
    : supabase.from("closings").insert(row).select("closing_no").single();
  const { data, error } = await q;
  if (error) return { error: error.message.replace(/^.*?(The commission split)/, "$1") };
  if (!data) return { error: "Couldn't save the closing." };
  return { next: `/closings/${data.closing_no}` };
}

/** Mark a payout paid (or undo). Agent payouts run on the 10th / 20th / last-day cycles; referrers after Axe is paid. */
export async function markPayout(payoutId: string, paidOn: string | null, withholding?: number | null): Promise<{ error?: string }> {
  try { await admin(); } catch (e) { return { error: (e as Error).message }; }
  const supabase = await createClient();
  const { error } = await supabase.from("commission_payouts")
    .update({ paid_on: paidOn, ...(withholding != null ? { withholding_tax: withholding } : {}) }).eq("id", payoutId);
  if (error) return { error: error.message };
  refresh();
  return {};
}
