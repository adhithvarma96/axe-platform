import "server-only";
import type { Field } from "../party-form";
import { createClient } from "@/lib/supabase/server";

/** Form fields with the live category and agent lists; NIC only for the Super Admin. */
export async function referralPartnerFields(isSuperAdmin: boolean): Promise<Field[]> {
  const supabase = await createClient();
  const [cats, agents] = await Promise.all([
    supabase.from("referrer_categories").select("id, name").order("sort_order"),
    supabase.from("agents").select("id, full_name").eq("status", "active").is("deleted_at", null).order("full_name"),
  ]);
  const fields: Field[] = [
    { name: "full_name", label: "Name", required: true },
    { name: "company_organization", label: "Company / organisation" },
    { name: "phone", label: "Phone", type: "tel", placeholder: "+94…" },
    { name: "email", label: "Email", type: "email" },
    { name: "referrer_category_id", label: "Category", type: "select", options: (cats.data ?? []).map((c) => [c.id, c.name]) },
    { name: "attribution", label: "Whose referrer", type: "select", options: [["company_referrer", "Company referrer"], ["agent_personal_referrer", "Agent's personal referrer"]] },
    { name: "attributed_to_agent_id", label: "Agent", type: "select", options: (agents.data ?? []).map((a) => [a.id, a.full_name]) },
    { name: "referral_rate_pct", label: "Referral rate (% of the referred side's commission, max 15)", type: "number" },
    { name: "agreement_signed_on", label: "Agreement signed", type: "date" },
    { name: "agreement_valid_until", label: "Agreement valid until", type: "date" },
    { name: "address", label: "Address", wide: true },
  ];
  if (isSuperAdmin) fields.push({ name: "nic_number", label: "NIC number (Super Admin only)" });
  fields.push({ name: "notes", label: "Notes", type: "textarea" });
  return fields;
}
