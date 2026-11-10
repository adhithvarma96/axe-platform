"use server";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const OK = ["prospect", "assessment_booked", "mandate_won", "lost"] as const;

/** Owner mandate lifecycle (SPEC 8.3): Prospect -> Assessment booked -> Mandate won / Lost. */
export async function setMandate(id: string, status: string): Promise<{ error?: string }> {
  await requireUser();
  const value = (OK as readonly string[]).includes(status) ? (status as (typeof OK)[number]) : null;
  const supabase = await createClient();
  const { error } = await supabase.from("owners").update({ mandate_status: value }).eq("id", id);
  if (error) return { error: /row-level/i.test(error.message) ? "You don't have permission to do that." : error.message };
  refresh();
  return {};
}
