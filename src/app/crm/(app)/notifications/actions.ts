"use server";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Marks one (or, with no id, all) of the signed-in user's notifications as read. */
export async function markRead(id?: string) {
  const user = await requireUser();
  if (!user.agentId) return;
  const supabase = await createClient();
  let q = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_agent_id", user.agentId).is("read_at", null);
  if (id) q = q.eq("id", id);
  await q;
  refresh();
}
