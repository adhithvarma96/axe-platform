import "server-only";
import { createClient } from "@/lib/supabase/server";
import { label, money } from "@/lib/format";
import type { ComboOption } from "./combo";

/** Leads for a type-to-search picker: id is the ARLD code; search covers name, phone and email. */
export async function leadChoices(opts: { openOnly?: boolean } = {}): Promise<ComboOption[]> {
  const s = await createClient();
  let q = s.from("leads").select("lead_code, name, phone, email, pipeline_status, agent:agents!leads_assigned_agent_id_fkey(full_name)").is("deleted_at", null);
  if (opts.openOnly) q = q.not("pipeline_status", "in", "(lost,closed_won)");
  const { data } = await q.order("created_at", { ascending: false }).limit(4000);
  return (data ?? []).filter((l) => l.lead_code).map((l) => ({
    id: l.lead_code!, name: `${l.lead_code} – ${l.name}`,
    hint: [label(l.pipeline_status), l.agent?.full_name, l.phone].filter(Boolean).join(" · "),
    search: [l.lead_code, l.name, l.phone, (l.phone ?? "").replace(/\D/g, ""), l.email].filter(Boolean).join(" ").toLowerCase(),
  }));
}

/** Properties for a picker: id is the listing no; search covers development, building, tower, unit, area, owner, beds. */
export async function propertyChoices(): Promise<ComboOption[]> {
  const s = await createClient();
  const { data } = await s.from("properties").select(`listing_no, status, property_type, building_name, unit_number, beds, square_feet, asking_rent, rent_currency, asking_sale_price, sale_currency,
      tower_name_legacy, tower:development_towers(name), development:developments(name), location:locations(name), owner:owners(name)`)
    .is("deleted_at", null).order("seq_no", { ascending: false }).limit(4000);
  return (data ?? []).filter((p) => p.listing_no).map((p) => {
    const place = p.development?.name ?? p.building_name ?? label(p.property_type);
    const tower = p.tower?.name ?? p.tower_name_legacy ?? null;
    const facts = [p.location?.name, p.beds != null ? `${p.beds} bed` : null, p.square_feet ? `${Math.round(p.square_feet).toLocaleString()} sq ft` : null,
      p.asking_rent != null ? `${money(p.asking_rent, p.rent_currency)}/mo` : null, p.asking_sale_price != null ? money(p.asking_sale_price, p.sale_currency) : null, label(p.status)];
    return {
      id: p.listing_no!, name: `${p.listing_no} · ${[place, tower, p.unit_number ? `Unit ${p.unit_number}` : null].filter(Boolean).join(" · ")}`,
      hint: [...facts, p.owner?.name ? `Owner: ${p.owner.name}` : null].filter(Boolean).join(" · "),
      search: [p.listing_no, place, tower, p.unit_number, p.location?.name, p.owner?.name, p.beds != null ? `${p.beds} bed ${p.beds}bed` : null].filter(Boolean).join(" ").toLowerCase(),
    };
  });
}
