import type { Field } from "../party-form";

export const EXTERNAL_AGENT_FIELDS: Field[] = [
  { name: "agent_name", label: "Name", required: true },
  { name: "company", label: "Company" },
  { name: "phone", label: "Phone", type: "tel", placeholder: "+94…" },
  { name: "whatsapp", label: "WhatsApp", type: "tel", placeholder: "+94…" },
  { name: "email", label: "Email", type: "email" },
  { name: "reliability", label: "Reliability", type: "select", options: [["5", "5 · excellent"], ["4", "4 · good"], ["3", "3 · average"], ["2", "2 · patchy"], ["1", "1 · avoid"]] },
  { name: "areas_covered_text", label: "Areas and buildings they cover", wide: true },
  { name: "notes", label: "Notes", type: "textarea" },
];
