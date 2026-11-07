// One definition of the editable property fields, used by the form (to render)
// and by the save action (to validate). Database rules (RLS, triggers) still
// have the final say: e.g. only a Super Admin can change commission_structure.

export type FieldKind = "text" | "textarea" | "number" | "int" | "date" | "bool" | "enum" | "ref" | "url";
export interface Field {
  name: string;
  label: string;
  kind: FieldKind;
  options?: readonly string[]; // enum values
  ref?: "locations" | "developments" | "towers" | "owners" | "agents" | "referral_partners" | "source_channels";
  required?: boolean;
  help?: string;
  adminOnly?: boolean;
}
export interface Group {
  id: string;
  title: string;
  types?: readonly string[]; // property types this group applies to (all when absent)
  fields: Field[];
}

export const PROPERTY_TYPES = ["apartment", "house", "land", "villa", "commercial"] as const;
export const STATUSES = ["available", "reserved", "rented", "sold", "withdrawn"] as const;
export const LISTING_TYPES = ["rent_long_term", "rent_short_term", "sale"] as const;
const CURRENCY = ["LKR", "USD"] as const;

export const GROUPS: Group[] = [
  {
    id: "basics", title: "Basics", fields: [
      { name: "property_type", label: "Property type", kind: "enum", options: PROPERTY_TYPES, required: true },
      { name: "status", label: "Status", kind: "enum", options: STATUSES, required: true },
      { name: "condition", label: "Condition", kind: "enum", options: ["brand_new", "off_plan", "under_construction", "used"] },
      { name: "expected_completion_date", label: "Expected completion", kind: "date" },
      { name: "listing_date", label: "Listing date", kind: "date", help: "When Axe took the listing" },
    ],
  },
  {
    id: "where", title: "Where", fields: [
      { name: "location_id", label: "Location", kind: "ref", ref: "locations" },
      { name: "development_id", label: "Development", kind: "ref", ref: "developments" },
      { name: "tower_id", label: "Tower", kind: "ref", ref: "towers", help: "Only the chosen development's towers" },
      { name: "unit_number", label: "Unit number", kind: "text", help: "Internal only, never shown on the website" },
      { name: "floor", label: "Floor", kind: "text", help: "Internal only" },
      { name: "building_name", label: "Building name", kind: "text" },
    ],
  },
  {
    id: "size", title: "Size & layout", fields: [
      { name: "beds", label: "Bedrooms", kind: "int" },
      { name: "baths", label: "Bathrooms", kind: "int" },
      { name: "parking", label: "Parking", kind: "int" },
      { name: "square_feet", label: "Size (sq ft)", kind: "number" },
      { name: "furnished", label: "Furnished", kind: "enum", options: ["fully", "semi", "unfurnished", "unknown"] },
      { name: "maids_room", label: "Maid's room", kind: "bool" },
      { name: "maids_bath", label: "Maid's bath", kind: "bool" },
    ],
  },
  {
    id: "price", title: "Pricing & availability", fields: [
      { name: "asking_rent", label: "Asking rent (per month)", kind: "number" },
      { name: "rent_currency", label: "Rent currency", kind: "enum", options: CURRENCY },
      { name: "asking_sale_price", label: "Asking sale price", kind: "number" },
      { name: "sale_currency", label: "Sale currency", kind: "enum", options: CURRENCY },
      { name: "price_on_request", label: "Price on request (hide price on website)", kind: "bool" },
      { name: "available_from", label: "Available from", kind: "date" },
      { name: "next_available_date", label: "Next available", kind: "date" },
      { name: "last_verified", label: "Last verified", kind: "date", help: "Date someone last confirmed it's still on the market" },
    ],
  },
  {
    id: "sourcing", title: "Owner & sourcing", fields: [
      { name: "owner_id", label: "Owner", kind: "ref", ref: "owners" },
      { name: "listing_agent_id", label: "Listing agent", kind: "ref", ref: "agents" },
      { name: "sourcing_model", label: "Sourcing model", kind: "enum", options: ["company_direct", "company_via_referrer", "agent_self_sourced", "agent_via_referrer"] },
      { name: "referral_partner_id", label: "Referral partner", kind: "ref", ref: "referral_partners", help: "Required for the via-referrer models" },
      { name: "source_channel_id", label: "Source channel", kind: "ref", ref: "source_channels" },
      { name: "listing_source_type", label: "Listing source", kind: "enum", options: ["direct", "via_agent"] },
      { name: "commission_structure", label: "Commission structure", kind: "text", adminOnly: true, help: "Super Admin only" },
    ],
  },
  {
    id: "house", title: "House & villa", types: ["house", "villa"], fields: [
      { name: "land_extent_perches", label: "Land extent (perches)", kind: "number" },
      { name: "built_up_area_sqft", label: "Built-up area (sq ft)", kind: "number" },
      { name: "number_of_floors", label: "Floors", kind: "int" },
      { name: "garden", label: "Garden", kind: "bool" },
      { name: "garden_size_perches", label: "Garden size (perches)", kind: "number" },
      { name: "servant_quarters", label: "Servant quarters", kind: "bool" },
      { name: "boundary_wall", label: "Boundary wall", kind: "bool" },
      { name: "water_source", label: "Water source", kind: "enum", options: ["mains", "well", "tube_well", "both"] },
      { name: "roof_type", label: "Roof type", kind: "text" },
      { name: "generator", label: "Generator", kind: "bool" },
    ],
  },
  {
    id: "villa", title: "Villa & short let", types: ["villa"], fields: [
      { name: "pool", label: "Pool", kind: "bool" },
      { name: "pool_size", label: "Pool size", kind: "enum", options: ["small", "medium", "large"] },
      { name: "sea_view", label: "Sea view", kind: "bool" },
      { name: "beach_access", label: "Beach access", kind: "bool" },
      { name: "beach_distance_m", label: "Beach distance (m)", kind: "number" },
      { name: "outdoor_dining", label: "Outdoor dining", kind: "bool" },
      { name: "daily_rate", label: "Daily rate", kind: "number" },
      { name: "daily_rate_currency", label: "Daily rate currency", kind: "enum", options: CURRENCY },
      { name: "weekly_rate", label: "Weekly rate", kind: "number" },
      { name: "monthly_rate_short_let", label: "Monthly rate (short let)", kind: "number" },
      { name: "minimum_stay_nights", label: "Minimum stay (nights)", kind: "int" },
      { name: "max_occupancy", label: "Max occupancy", kind: "int" },
      { name: "cleaning_fee", label: "Cleaning fee", kind: "number" },
    ],
  },
  {
    id: "land", title: "Land", types: ["land"], fields: [
      { name: "land_extent_perches", label: "Extent (perches)", kind: "number" },
      { name: "frontage_ft", label: "Frontage (ft)", kind: "number" },
      { name: "depth_ft", label: "Depth (ft)", kind: "number" },
      { name: "land_shape", label: "Shape", kind: "enum", options: ["square", "rectangular", "irregular"] },
      { name: "land_category", label: "Category", kind: "enum", options: ["residential", "commercial", "mixed", "agricultural", "beachfront"] },
      { name: "title_type", label: "Title", kind: "enum", options: ["freehold", "leasehold", "crown_grant"] },
      { name: "road_access_width_ft", label: "Road access width (ft)", kind: "number" },
      { name: "beachfront", label: "Beachfront", kind: "bool" },
      { name: "beach_frontage_ft", label: "Beach frontage (ft)", kind: "number" },
      { name: "distance_to_sea_ft", label: "Distance to sea (ft)", kind: "number" },
      { name: "electricity_available", label: "Electricity", kind: "bool" },
      { name: "water_mains_available", label: "Water mains", kind: "bool" },
      { name: "telecom_available", label: "Telecom / internet", kind: "bool" },
      { name: "subdivided", label: "Subdivided", kind: "bool" },
    ],
  },
  {
    id: "commercial", title: "Commercial", types: ["commercial"], fields: [
      { name: "commercial_sub_category", label: "Sub-category", kind: "enum", options: ["office", "retail", "warehouse"] },
      { name: "total_floor_area_sqft", label: "Total floor area (sq ft)", kind: "number" },
      { name: "year_built", label: "Year built", kind: "int" },
      { name: "building_grade", label: "Building grade", kind: "enum", options: ["a", "b", "c"] },
      { name: "service_charge_lkr", label: "Service charge (LKR/month)", kind: "number" },
      { name: "floors_available", label: "Floors available", kind: "text" },
      { name: "workstation_capacity", label: "Workstations", kind: "int" },
      { name: "conference_rooms", label: "Conference rooms", kind: "int" },
      { name: "air_conditioning", label: "Air conditioning", kind: "enum", options: ["central", "split", "none"] },
      { name: "server_it_room", label: "Server / IT room", kind: "bool" },
      { name: "shared_or_dedicated", label: "Floor", kind: "enum", options: ["shared_floor", "dedicated_floor"] },
      { name: "storefront_type", label: "Storefront", kind: "enum", options: ["glass", "solid", "mixed"] },
      { name: "foot_traffic", label: "Foot traffic", kind: "enum", options: ["high", "medium", "low"] },
      { name: "signage_rights", label: "Signage rights", kind: "bool" },
      { name: "ceiling_height_ft", label: "Ceiling height (ft)", kind: "number" },
      { name: "loading_docks", label: "Loading docks", kind: "int" },
      { name: "truck_container_access_40ft", label: "40 ft truck access", kind: "bool" },
      { name: "cold_storage", label: "Cold storage", kind: "bool" },
      { name: "three_phase_power", label: "Three-phase power", kind: "bool" },
      { name: "bulk_lease_available", label: "Bulk lease available", kind: "bool" },
      { name: "bulk_discount_pct", label: "Bulk discount %", kind: "number" },
      { name: "bulk_minimum_units", label: "Bulk minimum units", kind: "int" },
    ],
  },
  {
    id: "notes", title: "Notes & links", fields: [
      { name: "public_notes", label: "Public notes", kind: "textarea", help: "The only free text that can appear on the website. No unit numbers, owner names or deal details." },
      { name: "internal_notes", label: "Internal notes", kind: "textarea" },
      { name: "map_pin", label: "Map pin", kind: "url", help: "Internal only" },
      { name: "photos_link", label: "Photos folder (Google Drive)", kind: "url" },
      { name: "customer_photo_link", label: "Client gallery link", kind: "url" },
    ],
  },
  {
    id: "distribution", title: "Distribution checklist", fields: [
      { name: "lanka_property_web_posted", label: "Posted on LankaPropertyWeb", kind: "bool" },
      { name: "ikman_posted", label: "Posted on ikman.lk", kind: "bool" },
      { name: "realtor_wa_groups_posted", label: "Shared in realtor WhatsApp groups", kind: "bool" },
      { name: "google_indexed", label: "Indexed on Google", kind: "bool" },
    ],
  },
];

/** Groups that apply to a property type (apartment shows only the shared groups). */
export function groupsFor(type: string) {
  return GROUPS.filter((g) => !g.types || g.types.includes(type));
}

const UUID = /^[0-9a-f-]{36}$/;

/** Turns submitted form data into a database row for the given type. Throws a readable message on bad input. */
export function parseProperty(form: FormData, isAdmin: boolean): Record<string, unknown> {
  const type = String(form.get("property_type") ?? "");
  if (!PROPERTY_TYPES.includes(type as never)) throw new Error("Choose a property type.");
  const row: Record<string, unknown> = {};
  const seen = new Set<string>();
  for (const g of groupsFor(type)) {
    for (const f of g.fields) {
      if (seen.has(f.name)) continue;
      seen.add(f.name);
      if (f.adminOnly && !isAdmin) continue;
      const raw = form.get(f.name);
      const s = typeof raw === "string" ? raw.trim() : "";
      switch (f.kind) {
        case "bool": row[f.name] = raw === "on" || raw === "true"; break;
        case "number":
        case "int": {
          if (!s) { row[f.name] = null; break; }
          const n = Number(s.replace(/,/g, ""));
          if (!Number.isFinite(n) || n < 0) throw new Error(`${f.label}: enter a number.`);
          row[f.name] = f.kind === "int" ? Math.round(n) : n;
          break;
        }
        case "enum":
          if (!s) { if (f.required) throw new Error(`${f.label} is required.`); row[f.name] = null; break; }
          if (!f.options!.includes(s)) throw new Error(`${f.label}: invalid choice.`);
          row[f.name] = s;
          break;
        case "ref":
          if (s && !UUID.test(s)) throw new Error(`${f.label}: invalid choice.`);
          row[f.name] = s || null;
          break;
        case "date":
          if (s && !/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`${f.label}: invalid date.`);
          row[f.name] = s || null;
          break;
        case "url":
          if (s && !/^https?:\/\//i.test(s)) throw new Error(`${f.label}: must start with https://`);
          row[f.name] = s || null;
          break;
        default:
          row[f.name] = s || null;
      }
    }
  }
  row.listing_types = LISTING_TYPES.filter((t) => form.get(`listing_type_${t}`) === "on");
  if (row.asking_rent != null && !row.rent_currency) throw new Error("Choose the rent currency.");
  if (row.asking_sale_price != null && !row.sale_currency) throw new Error("Choose the sale currency.");
  return row;
}
