"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PartyState } from "../party-form";

const s = (f: FormData, k: string) => { const v = String(f.get(k) ?? "").trim(); return v || null; };

/** Add or edit a location (area). Its website page is set up separately with Adhith. */
export async function saveLocation(_prev: PartyState, form: FormData): Promise<PartyState> {
  await requireUser();
  const id = s(form, "id");
  const name = s(form, "name");
  if (!name) return { error: "Enter the location's name." };
  const tier = s(form, "market_tier");
  const row = {
    name, province_id: s(form, "province_id"), postal_code: s(form, "postal_code"),
    market_tier: (tier === "prime_core" || tier === "outside_core" ? tier : null) as never, notes: s(form, "notes"),
  };
  const supabase = await createClient();
  const res = id ? await supabase.from("locations").update(row).eq("id", id).select("id").single() : await supabase.from("locations").insert(row).select("id").single();
  if (res.error) return { error: /duplicate|unique/i.test(res.error.message) ? "A location with that name already exists." : /row-level/i.test(res.error.message) ? "You don't have permission to do that." : res.error.message };
  redirect(`/locations/${res.data.id}`);
}
