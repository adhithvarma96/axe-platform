import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/database.types";

/** Supabase client acting as the signed-in user. Every query passes through RLS. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(publicEnv.supabaseUrl(), publicEnv.supabaseKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}

export type Role = "super_admin" | "sales_manager" | "agent" | "data_entry";

export interface CurrentUser {
  userId: string;
  email: string | undefined;
  agentId: string | null;
  fullName: string | null;
  role: Role | null;
  aal: "aal1" | "aal2";
  hasMfaFactor: boolean;
}

/** The signed-in user, their agent record and their 2FA level, or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return null;

  // aal comes from the verified token; factors from the Auth server (not the cookie).
  const [{ data: agent }, { data: factors }] = await Promise.all([
    supabase.from("agents").select("id, full_name, role, status").eq("user_id", claims.sub).maybeSingle(),
    supabase.auth.mfa.listFactors(),
  ]);

  return {
    userId: claims.sub,
    email: claims.email as string | undefined,
    agentId: agent?.status === "active" ? agent.id : null,
    fullName: agent?.full_name ?? null,
    role: agent?.status === "active" ? (agent.role as Role) : null,
    aal: claims.aal === "aal2" ? "aal2" : "aal1",
    hasMfaFactor: (factors?.totp ?? []).some((f) => f.status === "verified"),
  };
}

/** Super Admins must pass 2FA; the database enforces this too (app.can). */
export function needsMfa(user: CurrentUser): "setup" | "verify" | null {
  if (user.role !== "super_admin") return user.hasMfaFactor && user.aal !== "aal2" ? "verify" : null;
  if (!user.hasMfaFactor) return "setup";
  return user.aal === "aal2" ? null : "verify";
}
