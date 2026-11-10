import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { FormOptions } from "./property-form";

/** Dropdown options for the property form, read as the signed-in user. */
export async function loadFormOptions(): Promise<FormOptions> {
  const supabase = await createClient();
  const [locations, developments, towers, owners, agents, referrers, channels, features, extAgents] = await Promise.all([
    supabase.from("locations").select("id, name").is("deleted_at", null).order("name"),
    supabase.from("developments").select("id, name").is("deleted_at", null).order("name"),
    supabase.from("development_towers").select("id, name, development_id").is("deleted_at", null).order("name"),
    supabase.from("owners").select("id, name").is("deleted_at", null).order("name").limit(5000),
    supabase.from("agents").select("id, full_name").eq("status", "active").is("deleted_at", null).order("full_name"),
    supabase.from("referral_partners").select("id, full_name").is("deleted_at", null).order("full_name"),
    supabase.from("source_channels").select("id, name, applies_to_properties").is("deleted_at", null).order("sort_order"),
    supabase.from("property_features").select("id, name").is("deleted_at", null).order("sort_order"),
    supabase.from("external_agents").select("id, name:agent_name, company").is("deleted_at", null).order("agent_name").limit(5000),
  ]);
  return {
    locations: locations.data ?? [],
    developments: developments.data ?? [],
    towers: (towers.data ?? []).map((t) => ({ id: t.id, name: t.name, development_id: t.development_id })),
    owners: owners.data ?? [],
    agents: (agents.data ?? []).map((a) => ({ id: a.id, name: a.full_name })),
    referral_partners: (referrers.data ?? []).map((r) => ({ id: r.id, name: r.full_name })),
    source_channels: (channels.data ?? []).filter((c) => c.applies_to_properties).map((c) => ({ id: c.id, name: c.name })),
    features: features.data ?? [],
    external_agents: (extAgents.data ?? []).map((a) => ({ id: a.id, name: a.company ? `${a.name} (${a.company})` : a.name })),
  };
}
