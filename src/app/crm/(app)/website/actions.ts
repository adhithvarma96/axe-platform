"use server";
import { refresh, revalidateTag } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ReviewState = { ok?: boolean; error?: string };
const s = (f: FormData, k: string) => { const v = String(f.get(k) ?? "").trim(); return v || null; };

async function guard() {
  const user = await requireUser();
  return user.role === "super_admin";
}

/** Add or edit a website review (copy the Google wording exactly). */
export async function saveReview(_prev: ReviewState, form: FormData): Promise<ReviewState> {
  if (!(await guard())) return { error: "Only the Super Admin can change reviews." };
  const name = s(form, "reviewer_name"), body = s(form, "body");
  if (!name || !body) return { error: "Add the reviewer's name and the review text." };
  const rating = Math.min(5, Math.max(1, Number(s(form, "rating") ?? 5) || 5));
  const row = { reviewer_name: name, body, rating, review_date: s(form, "review_date"), sort_order: Number(s(form, "sort_order") ?? 100) || 100 };
  const supabase = await createClient();
  const id = s(form, "id");
  const { error } = id ? await supabase.from("site_reviews").update(row).eq("id", id) : await supabase.from("site_reviews").insert(row);
  if (error) return { error: error.message };
  revalidateTag("reviews", "max");
  refresh();
  return { ok: true };
}

export async function setReviewShown(id: string, shown: boolean): Promise<ReviewState> {
  if (!(await guard())) return { error: "Only the Super Admin can change reviews." };
  const supabase = await createClient();
  const { error } = await supabase.from("site_reviews").update({ is_published: shown }).eq("id", id);
  if (error) return { error: error.message };
  revalidateTag("reviews", "max");
  refresh();
  return { ok: true };
}
