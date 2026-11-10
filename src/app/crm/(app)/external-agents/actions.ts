"use server";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PartyState } from "../party-form";

const s = (f: FormData, k: string) => { const v = String(f.get(k) ?? "").trim(); return v || null; };
const friendly = (m: string) => (/row-level security/i.test(m) ? "You don't have permission to do that." : m);

export async function saveExternalAgent(_prev: PartyState, form: FormData): Promise<PartyState> {
  await requireUser();
  const supabase = await createClient();
  const id = s(form, "id");
  const agent_name = s(form, "agent_name");
  if (!agent_name) return { error: "Enter the agent's name." };
  const rel = s(form, "reliability");
  const row = {
    agent_name, company: s(form, "company"), phone: s(form, "phone"), whatsapp: s(form, "whatsapp"),
    email: s(form, "email")?.toLowerCase() ?? null, areas_covered_text: s(form, "areas_covered_text"),
    reliability: rel ? Math.min(5, Math.max(1, Number(rel))) : null, notes: s(form, "notes"),
  };
  if (id) {
    const { error } = await supabase.from("external_agents").update(row).eq("id", id);
    if (error) return { error: friendly(error.message) };
    refresh();
    return { ok: true };
  }
  const { data, error } = await supabase.from("external_agents").insert(row).select("id").single();
  if (error) return { error: friendly(error.message) };
  redirect(`/external-agents/${data.id}`);
}
