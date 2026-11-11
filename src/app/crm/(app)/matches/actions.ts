"use server";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { matchLead, matchProperty } from "@/lib/matching";

export type MatchState = { error?: string; note?: string | null; count?: number };

/** "Find matches" on a lead or a property. Runs as the signed-in user (RLS applies). */
export async function findMatches(kind: "lead" | "property", id: string): Promise<MatchState> {
  await requireUser();
  if (!/^[0-9a-f-]{36}$/.test(id)) return { error: "Unknown record." };
  const supabase = await createClient();
  const out = kind === "lead" ? await matchLead(supabase, id) : await matchProperty(supabase, id);
  refresh();
  if (out.error) return { error: out.error };
  return { note: out.note, count: out.count };
}
