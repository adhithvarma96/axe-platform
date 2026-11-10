import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ViewingOptions } from "./viewing-form";

export async function viewingOptions(): Promise<ViewingOptions> {
  const s = await createClient();
  const [props, leads, agents, externals] = await Promise.all([
    s.from("properties").select("listing_no, development:developments(name), location:locations(name), beds").is("deleted_at", null).order("seq_no", { ascending: false }).limit(3000),
    s.from("leads").select("lead_code, name").is("deleted_at", null).not("pipeline_status", "in", "(lost,closed_won)").order("created_at", { ascending: false }).limit(2000),
    s.from("agents").select("id, full_name").eq("status", "active").is("deleted_at", null).neq("role", "data_entry").order("full_name"),
    s.from("external_agents").select("id, agent_name").is("deleted_at", null).order("agent_name"),
  ]);
  return {
    properties: (props.data ?? []).filter((p) => p.listing_no).map((p) => ({
      no: p.listing_no!, label: [p.development?.name, p.location?.name, p.beds != null ? `${p.beds} bed` : null].filter(Boolean).join(" · "),
    })),
    leads: (leads.data ?? []).filter((l) => l.lead_code).map((l) => ({ code: l.lead_code!, label: l.name })),
    agents: (agents.data ?? []).map((a) => ({ id: a.id, name: a.full_name })),
    externals: (externals.data ?? []).map((a) => ({ id: a.id, name: a.agent_name })),
  };
}
