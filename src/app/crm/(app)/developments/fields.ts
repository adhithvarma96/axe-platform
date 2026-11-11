import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Field } from "../party-form";

export async function developmentFields(): Promise<Field[]> {
  const supabase = await createClient();
  const { data: locs } = await supabase.from("locations").select("id, name").is("deleted_at", null).order("name");
  return [
    { name: "name", label: "Development name", required: true },
    { name: "location_id", label: "Location", type: "combo", options: (locs ?? []).map((l) => ({ id: l.id, name: l.name })), placeholder: "Type an area" },
    { name: "developer_builder", label: "Developer / builder" },
    { name: "development_status", label: "Status", type: "select", options: [["completed", "Completed"], ["under_construction", "Under construction"], ["off_plan", "Off-plan"], ["pre_launch", "Pre-launch"]] },
    { name: "year_completed", label: "Year completed", type: "number" },
    { name: "total_units", label: "Total units", type: "number" },
    { name: "towers_blocks", label: "Towers / blocks (description)", wide: true, placeholder: "e.g. Two towers: North and South, 48 floors" },
    { name: "notes", label: "Notes", type: "textarea" },
  ];
}
