import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";

/**
 * Service client: bypasses row-level security. Only for scheduled jobs, the
 * migration script, and the Auth admin API behind a Super Admin check (team logins).
 */
export function createAdminClient() {
  return createClient(publicEnv.supabaseUrl(), serverEnv().supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
