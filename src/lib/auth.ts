import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, needsMfa, type CurrentUser } from "@/lib/supabase/server";

/** For app pages: signed in, linked to an active team member, 2FA done where required. */
export async function requireUser(): Promise<CurrentUser & { role: NonNullable<CurrentUser["role"]> }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (needsMfa(user)) redirect("/mfa");
  if (!user.role) redirect("/no-access");
  return user as CurrentUser & { role: NonNullable<CurrentUser["role"]> };
}
