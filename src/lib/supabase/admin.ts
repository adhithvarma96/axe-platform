import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";

/**
 * Service client: bypasses row-level security. Only for scheduled jobs and the
 * migration script, never for anything a user triggers directly.
 */
export function createAdminClient() {
  return createClient(publicEnv.supabaseUrl(), serverEnv().supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
