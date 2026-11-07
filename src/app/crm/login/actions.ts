"use server";
import { createClient } from "@/lib/supabase/server";

// Actions return where to go; the browser navigates there so the request passes through the
// app/site routing in proxy.ts (a redirect() inside an action would render the target inline,
// bypassing that routing, and the website would answer).
export type SignInState = { error?: string; next?: string };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "That email and password don't match an active account." };

  return { next: "/" }; // the home page decides: 2FA setup, 2FA check, or the app
}

export async function signOut(): Promise<{ next: string }> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { next: "/login" };
}
