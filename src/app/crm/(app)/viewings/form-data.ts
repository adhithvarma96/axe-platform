import "server-only";
import { createClient } from "@/lib/supabase/server";
import { label, money } from "@/lib/format";
import type { ViewingOptions } from "./viewing-form";
import { leadChoices } from "../choices";

export async function viewingOptions(): Promise<ViewingOptions> {
  const s = await createClient();
  const [props, leads, agents, externals] = await Promise.all([
    s.from("properties").select(`listing_no, status, property_type, building_name, unit_number, beds, square_feet, asking_rent, rent_currency, asking_sale_price, sale_currency,
      tower_name_legacy, tower:development_towers(name), development:developments(name), location:locations(name), owner:owners(name)`)
      .is("deleted_at", null).order("seq_no", { ascending: false }).limit(4000),
    leadChoices({ openOnly: true }),
    s.from("agents").select("id, full_name").eq("status", "active").is("deleted_at", null).neq("role", "data_entry").order("full_name"),
    s.from("external_agents").select("id, agent_name").is("deleted_at", null).order("agent_name"),
  ]);
  const rank = (st: string | null) => (st === "available" ? 0 : st === "upcoming" ? 1 : 2);
  const properties = (props.data ?? []).filter((p) => p.listing_no).map((p) => {
    const place = p.development?.name ?? p.building_name ?? null;
    const tower = p.tower?.name ?? p.tower_name_legacy ?? null;
    const rent = p.asking_rent != null ? `${money(p.asking_rent, p.rent_currency)}/mo` : null;
    const sale = p.asking_sale_price != null ? money(p.asking_sale_price, p.sale_currency) : null;
    const title = [place ?? label(p.property_type), tower, p.unit_number ? `Unit ${p.unit_number}` : null].filter(Boolean).join(" · ");
    const facts = [p.location?.name, p.beds != null ? `${p.beds} bed` : null, p.square_feet ? `${Math.round(p.square_feet).toLocaleString()} sq ft` : null, rent, sale].filter(Boolean).join(" · ");
    return {
      no: p.listing_no!, label: [place, p.location?.name, p.beds != null ? `${p.beds} bed` : null].filter(Boolean).join(" · "),
      title, facts, owner: p.owner?.name ?? "", status: label(p.status), rank: rank(p.status),
      search: [p.listing_no, place, tower, p.unit_number, p.location?.name, p.owner?.name, p.beds != null ? `${p.beds} bed ${p.beds}bed` : null, label(p.property_type)].filter(Boolean).join(" ").toLowerCase(),
    };
  }).sort((a, b) => a.rank - b.rank);
  return {
    properties,
    leads,
    agents: (agents.data ?? []).map((a) => ({ id: a.id, name: a.full_name })),
    externals: (externals.data ?? []).map((a) => ({ id: a.id, name: a.agent_name })),
  };
}
