import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Field } from "../party-form";

export async function locationFields(): Promise<Field[]> {
  const supabase = await createClient();
  const { data: provinces } = await supabase.from("provinces").select("id, name").is("deleted_at", null).order("sort_order");
  return [
    { name: "name", label: "Location name", required: true, placeholder: "e.g. Colombo 04, Battaramulla" },
    { name: "province_id", label: "Province", type: "select", options: (provinces ?? []).map((p) => [p.id, p.name] as [string, string]) },
    { name: "postal_code", label: "Postal code" },
    { name: "market_tier", label: "Market tier", type: "select", options: [["prime_core", "Prime core"], ["outside_core", "Outside core"]] },
    { name: "notes", label: "Notes", type: "textarea" },
  ];
}
