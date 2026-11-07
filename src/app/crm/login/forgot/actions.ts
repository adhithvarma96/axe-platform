"use server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type ResetState = { sent?: boolean; error?: string };

/** Emails a password-reset link. Always answers the same way, so it never reveals which emails have accounts. */
export async function requestReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter your work email." };

  // The link comes back to whichever CRM address the person is using (it must be on
  // Supabase's Redirect URLs list, or Supabase sends them to the Site URL instead).
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") || host?.includes(".localhost") ? "http" : "https");
  const redirectTo = `${proto}://${host}/auth/confirm/?next=/reset-password/`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  // Rate limits are the only error worth showing; anything else looks like success.
  if (error && /rate|seconds|too many/i.test(error.message)) {
    return { error: "Too many reset emails just now. Wait a few minutes and try again." };
  }
  return { sent: true };
}
