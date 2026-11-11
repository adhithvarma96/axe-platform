"use server";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DELETABLE, LIST_HREF, type Deletable } from "./rules";

export type DeleteResult = { error?: string; blockers?: string[]; next?: string };

/** What still points at this record (live rows only). Empty means it can be deleted. */
async function blockers(table: Deletable, id: string): Promise<string[]> {
  const supabase = await createClient();
  const out: string[] = [];
  for (const l of DELETABLE[table].links) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase.from(l.table as any) as any).select("*", { count: "exact", head: true }).eq(l.col, id);
    if (l.soft) q = q.is("deleted_at", null);
    const { count } = await q;
    if (count) out.push(`${count} ${l.label}`);
  }
  return out;
}

export async function deleteRecord(table: Deletable, id: string): Promise<DeleteResult> {
  const user = await requireUser();
  if (user.role !== "super_admin") return { error: "Only the Super Admin can delete." };
  if (!(table in DELETABLE) || !/^[0-9a-f-]{36}$/.test(id)) return { error: "Unknown record." };
  const linked = await blockers(table, id);
  if (linked.length) return { blockers: linked };
  const supabase = await createClient();
  const patch: Record<string, unknown> = { deleted_at: new Date().toISOString() };
  if (table === "properties") patch.website_published = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table) as any).update(patch).eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return { next: LIST_HREF[table] };
}

export async function restoreRecord(table: Deletable, id: string): Promise<DeleteResult> {
  const user = await requireUser();
  if (user.role !== "super_admin") return { error: "Only the Super Admin can restore." };
  if (!(table in DELETABLE) || !/^[0-9a-f-]{36}$/.test(id)) return { error: "Unknown record." };
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table) as any).update({ deleted_at: null }).eq("id", id);
  if (error) return { error: /unique|duplicate/i.test(error.message) ? "Another live record already uses its number or name, so it can't come back as is." : error.message };
  refresh();
  return {};
}
