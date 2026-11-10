import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { LeadOptions } from "./lead-form";

/** Every pick-list the lead form needs, in one round of queries. */
export async function leadOptions(): Promise<LeadOptions> {
  const s = await createClient();
  const [agents, channels, externals, partners, owners, locations, developments, features, countries] = await Promise.all([
    s.from("agents").select("id, full_name").eq("status", "active").is("deleted_at", null).neq("role", "data_entry").order("full_name"),
    s.from("source_channels").select("id, name").eq("applies_to_leads", true).is("deleted_at", null).order("sort_order"),
    s.from("external_agents").select("id, full_name:agent_name").is("deleted_at", null).order("agent_name"),
    s.from("referral_partners").select("id, full_name").is("deleted_at", null).order("full_name"),
    s.from("owners").select("id, full_name:name").is("deleted_at", null).order("name"),
    s.from("locations").select("id, name").is("deleted_at", null).order("name"),
    s.from("developments").select("id, name").is("deleted_at", null).order("name"),
    s.from("property_features").select("id, name").is("deleted_at", null).order("sort_order"),
    s.from("countries").select("code, name").order("name"),
  ]);
  const opt = (rows: { id: string; full_name?: string | null; name?: string | null }[] | null) =>
    (rows ?? []).map((r) => ({ id: r.id, name: (r.full_name ?? r.name ?? "") as string }));
  return {
    agents: opt(agents.data), channels: opt(channels.data), externals: opt(externals.data), partners: opt(partners.data),
    owners: opt(owners.data), locations: opt(locations.data), developments: opt(developments.data), features: opt(features.data),
    countries: (countries.data ?? []).map((c) => ({ code: c.code, name: c.name })),
  };
}
