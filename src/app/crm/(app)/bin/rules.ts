// What can be deleted from the CRM, and which linked records block it (Adhith, 11 Nov:
// block until links are moved by hand). Deleting is a soft delete: the record moves to
// the Deleted bin and can be restored. Super Admin only (enforced again by the database).

export type Deletable = "properties" | "developments" | "owners" | "locations" | "external_agents" | "referral_partners";

export const DELETABLE: Record<Deletable, {
  label: string; nameCol: string; href: (row: { id: string; name: string }) => string;
  links: { table: string; col: string; label: string; soft?: boolean }[];
}> = {
  properties: {
    label: "Property", nameCol: "listing_no", href: (r) => `/properties/${r.name}`,
    links: [
      { table: "viewings", col: "property_id", label: "viewings", soft: true },
      { table: "closings", col: "property_id", label: "closings", soft: true },
      { table: "offers", col: "property_id", label: "offers", soft: true },
    ],
  },
  developments: {
    label: "Development", nameCol: "name", href: (r) => `/developments/${r.id}`,
    links: [{ table: "properties", col: "development_id", label: "properties", soft: true }],
  },
  owners: {
    label: "Owner", nameCol: "name", href: (r) => `/owners/${r.id}`,
    links: [
      { table: "properties", col: "owner_id", label: "properties", soft: true },
      { table: "leads", col: "linked_owner_id", label: "leads", soft: true },
    ],
  },
  locations: {
    label: "Location", nameCol: "name", href: (r) => `/locations/${r.id}`,
    links: [
      { table: "properties", col: "location_id", label: "properties", soft: true },
      { table: "developments", col: "location_id", label: "developments", soft: true },
    ],
  },
  external_agents: {
    label: "External agent", nameCol: "agent_name", href: (r) => `/external-agents/${r.id}`,
    links: [
      { table: "property_source_external_agents", col: "external_agent_id", label: "listings sourced through them" },
      { table: "owner_source_external_agents", col: "external_agent_id", label: "owners sourced through them" },
      { table: "leads", col: "referring_external_agent_id", label: "leads", soft: true },
      { table: "viewings", col: "co_broke_external_agent_id", label: "co-broke viewings", soft: true },
      { table: "closings", col: "co_broke_external_agent_id", label: "co-broke closings", soft: true },
    ],
  },
  referral_partners: {
    label: "Referral partner", nameCol: "full_name", href: (r) => `/referral-partners/${r.id}`,
    links: [
      { table: "properties", col: "referral_partner_id", label: "properties", soft: true },
      { table: "leads", col: "referral_partner_id", label: "leads", soft: true },
      { table: "closings", col: "lead_side_referral_partner_id", label: "closings (lead side)", soft: true },
      { table: "closings", col: "listing_side_referral_partner_id", label: "closings (listing side)", soft: true },
    ],
  },
};

export const LIST_HREF: Record<Deletable, string> = {
  properties: "/properties", developments: "/developments", owners: "/owners", locations: "/locations",
  external_agents: "/external-agents", referral_partners: "/referral-partners",
};
