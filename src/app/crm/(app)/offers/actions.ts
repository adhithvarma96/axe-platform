"use server";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fieldsFor, type OfferKind, type Terms } from "@/lib/offers";

export type OfferResult = { ok?: boolean; error?: string; ref?: string };

/** Saves a new offer version. Sent offers tick Gate 1 in the database (8.6). */
export async function createOffer(input: { leadId: string; propertyId: string | null; kind: OfferKind; validUntil: string; terms: Terms; send: boolean }): Promise<OfferResult> {
  await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.validUntil)) return { error: "Set a valid-until date." };
  const allowed = new Set(fieldsFor(input.kind).map((f) => f.key));
  const terms = Object.fromEntries(Object.entries(input.terms).filter(([k, v]) => allowed.has(k) && typeof v === "string").map(([k, v]) => [k, v.slice(0, 2000)]));
  const supabase = await createClient();
  const { data, error } = await supabase.from("offers").insert({
    lead_id: input.leadId, property_id: input.propertyId, deal_type: input.kind, valid_until: input.validUntil,
    terms, status: input.send ? "sent" : "draft",
  }).select("ref").single();
  if (error) return { error: /valid_until/.test(error.message) ? "Valid until must be on or after today." : /row-level/i.test(error.message) ? "You don't have permission to do that." : error.message };
  refresh();
  return { ok: true, ref: data.ref };
}

export async function setOfferStatus(ref: string, status: "sent" | "countered" | "accepted" | "rejected" | "expired"): Promise<OfferResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("offers").update({ status }).eq("ref", ref);
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}
