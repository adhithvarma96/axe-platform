import type { Field } from "../party-form";
import { MANDATES } from "./mandates";

export const OWNER_FIELDS: Field[] = [
  { name: "name", label: "Name", required: true },
  { name: "owner_type", label: "Type", type: "select", options: [["individual", "Individual"], ["corporate", "Corporate"], ["developer", "Developer"], ["bank", "Bank"], ["unknown_via_agent", "Unknown (via an agent)"]] },
  { name: "primary_phone", label: "Phone", type: "tel", placeholder: "+94…" },
  { name: "whatsapp", label: "WhatsApp", type: "tel", placeholder: "+94…" },
  { name: "email", label: "Email", type: "email" },
  { name: "contact_protocol", label: "How to contact", type: "select", options: [["direct_call_ok", "Direct call is fine"], ["introduce_via_whatsapp_first", "WhatsApp first"], ["route_through_adhith", "Route through Adhith"]] },
  { name: "mandate_status", label: "Mandate", type: "select", options: MANDATES },
  { name: "contact_notes", label: "Contact notes", wide: true },
  { name: "address", label: "Address", wide: true },
  { name: "notes", label: "Notes", type: "textarea" },
];
