// WhatsApp listing write-ups (SPEC 7.12). Generated on read, never stored.
// WhatsApp formatting: *bold* and plain line breaks; any line whose data is empty is left out.

export interface WriteupInput {
  listing_no: string | null;
  property_type: string;
  listing_types: string[] | null;
  beds: number | null;
  baths: number | null;
  square_feet: number | null;
  furnished: string | null;
  asking_rent: number | null;
  rent_currency: string | null;
  asking_sale_price: number | null;
  sale_currency: string | null;
  daily_rate?: number | null;
  daily_rate_currency?: string | null;
  public_notes: string | null;
  development: string | null;
  tower: string | null;
  location: string | null;
  features: string[];
  // house / villa / land / commercial extras (optional)
  land_extent_perches?: number | null;
  built_up_area_sqft?: number | null;
  number_of_floors?: number | null;
  parking?: number | null;
  garden?: boolean | null;
  garden_size_perches?: number | null;
  servant_quarters?: boolean | null;
  land_category?: string | null;
  frontage_ft?: number | null;
  depth_ft?: number | null;
  land_shape?: string | null;
  title_type?: string | null;
  beachfront?: boolean | null;
  beach_frontage_ft?: number | null;
  distance_to_sea_ft?: number | null;
  road_access_width_ft?: number | null;
  electricity_available?: boolean | null;
  water_mains_available?: boolean | null;
  pool?: boolean | null;
  pool_size?: string | null;
  sea_view?: boolean | null;
  beach_access?: boolean | null;
  beach_distance_m?: number | null;
  outdoor_dining?: boolean | null;
  generator?: boolean | null;
  commercial_sub_category?: string | null;
  building_name?: string | null;
  floors_available?: string | null;
  total_floor_area_sqft?: number | null;
  building_grade?: string | null;
  service_charge_lkr?: number | null;
}

export interface WriteupContact { name: string; title: string | null; phone: string }

const COMPANY: WriteupContact = { name: "Axe Realty", title: null, phone: "+94 77 791 8396" };
export const ROLE_TITLE: Record<string, string | null> = {
  super_admin: "Founder", sales_manager: "Sales Manager", agent: "Property Consultant", data_entry: null,
};

const n = (v: number) => Math.round(v).toLocaleString("en-US");
const trim = (v: number, d: number) => v.toFixed(d).replace(/\.?0+$/, "");
const cap = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Rent: "LKR 325,000/month". */
export function rentText(amount: number, currency: string | null): string {
  return `${currency ?? "LKR"} ${n(amount)}/month`;
}

/** Sale: large LKR prices as "95M" / "1.25B"; everything else with thousands separators. */
export function saleText(amount: number, currency: string | null): string {
  const cur = currency ?? "LKR";
  if (cur === "LKR" && amount >= 1_000_000_000) return `${cur} ${trim(amount / 1_000_000_000, 2)}B`;
  if (cur === "LKR" && amount >= 1_000_000) return `${cur} ${trim(amount / 1_000_000, 2)}M`;
  return `${cur} ${n(amount)}`;
}

function intent(types: string[] | null): string {
  const t = new Set(types ?? []);
  const long = t.has("rent_long_term"), short = t.has("rent_short_term"), sale = t.has("sale");
  if (short && sale && !long) return "Short Let & Sale";
  if (short && !long && !sale) return "Short Let";
  if ((long || short) && sale) return "Rent & Sale";
  if (sale) return "Sale";
  return "Rent";
}

const FURNISHED: Record<string, string> = { fully: "Fully Furnished", semi: "Semi Furnished", unfurnished: "Unfurnished" };

export function whatsappWriteup(p: WriteupInput, opts: { galleryUrl: string | null; contact: WriteupContact | null }): string {
  const L: (string | number | null | false | undefined)[] = [];
  const where = p.location ? ` In ${p.location}` : "";
  const forWhat = intent(p.listing_types);
  const beds = p.beds != null ? `${p.beds} Bed ` : "";
  const featureWords = ["Duplex", "Penthouse", "Pet Friendly"].filter((f) => p.features.some((x) => x.toLowerCase() === f.toLowerCase()));
  const type = p.property_type;

  L.push(p.listing_no && `*${p.listing_no}*`);
  if (type === "land") L.push(`*Land For ${forWhat}${where}*`);
  else if (type === "house") L.push(`*${beds}House For ${forWhat}${where}*`);
  else if (type === "villa") L.push(`*${beds}Villa For ${forWhat}${where}*`);
  else if (type === "commercial") {
    const sub = p.commercial_sub_category ? `${cap(p.commercial_sub_category)} Space` : "Commercial Property";
    L.push(`*${sub} For ${forWhat}${where}*`);
  } else L.push(`*${beds}${featureWords.map((f) => f + " ").join("")}Apartment For ${forWhat}${where}*`);

  const rent = p.asking_rent ? `-Asking Rental - ${rentText(p.asking_rent, p.rent_currency)}` : null;
  const sale = p.asking_sale_price ? `-Asking Sale Price - ${saleText(p.asking_sale_price, p.sale_currency)}` : null;
  const bedBath = p.beds != null || p.baths != null ? `-${[p.beds != null ? `${p.beds} Beds` : null, p.baths != null ? `${p.baths} Baths` : null].filter(Boolean).join(" / ")}` : null;
  const furnished = p.furnished && FURNISHED[p.furnished] ? `-Furnished Status - ${FURNISHED[p.furnished]}` : null;

  if (type === "land") {
    L.push(p.land_extent_perches && `-${trim(p.land_extent_perches, 2)} Perches`, p.land_category && `-${cap(p.land_category)}`,
      p.frontage_ft && `-Frontage - ${n(p.frontage_ft)} ft`, p.depth_ft && `-Depth - ${n(p.depth_ft)} ft`,
      p.land_shape && `-Shape - ${cap(p.land_shape)}`, p.title_type && `-Title - ${cap(p.title_type)}`,
      p.beachfront ? `-Beachfront${p.beach_frontage_ft ? ` (${n(p.beach_frontage_ft)} ft)` : ""}` : p.distance_to_sea_ft && `-Distance to Sea - ${n(p.distance_to_sea_ft)} ft`,
      p.road_access_width_ft && `-Road Access - ${n(p.road_access_width_ft)} ft`,
      p.electricity_available && "-Electricity Available", p.water_mains_available && "-Water Mains Available", sale);
  } else if (type === "house" || type === "villa") {
    L.push(p.land_extent_perches && `-${trim(p.land_extent_perches, 2)} Perches`,
      p.built_up_area_sqft && `-Built-up Area - ${n(p.built_up_area_sqft)} Sq. Ft.`,
      type === "house" && p.number_of_floors && `-${p.number_of_floors} Floor${p.number_of_floors === 1 ? "" : "s"}`,
      bedBath, type === "house" && p.parking && `-${p.parking} Parking`, furnished,
      type === "house" && p.garden && `-Garden${p.garden_size_perches ? ` (${trim(p.garden_size_perches, 2)} Perches)` : ""}`,
      type === "house" && p.servant_quarters && "-Servant Quarters",
      type === "villa" && p.pool && `-Pool${p.pool_size ? ` (${cap(p.pool_size)})` : ""}`,
      type === "villa" && p.sea_view && "-Sea View",
      type === "villa" && p.beach_access && `-Beach Access${p.beach_distance_m ? ` (${n(p.beach_distance_m)}m)` : ""}`,
      type === "villa" && p.outdoor_dining && "-Outdoor Dining/BBQ", type === "villa" && p.generator && "-Generator/Solar Backup",
      rent, type === "villa" && p.daily_rate && `-Short-let Daily - ${p.daily_rate_currency ?? "LKR"} ${n(p.daily_rate)}/night`, sale);
  } else if (type === "commercial") {
    L.push(p.building_name && `-${p.building_name}`, p.floors_available && `-Floors Available - ${p.floors_available}`,
      p.total_floor_area_sqft && `-Total Floor Area - ${n(p.total_floor_area_sqft)} Sq. Ft.`,
      p.building_grade && `-Building Grade - ${p.building_grade}`,
      rent, sale, p.service_charge_lkr && `-Service Charge - LKR ${n(p.service_charge_lkr)}/month`);
  } else {
    L.push(p.development && `-${p.development}${p.tower ? ` - ${p.tower}` : ""}`, bedBath,
      p.square_feet && `-${n(p.square_feet)} Sq. Ft.`, furnished,
      p.features.length > 0 && `-Features - ${p.features.join(", ")}`, rent, sale);
  }

  const notes = p.public_notes?.trim();
  if (notes) L.push("", "*Additional Property Notes:*", notes);
  L.push("", `Property Pictures Link - ${opts.galleryUrl ?? "Available on request"}`);
  const c = opts.contact?.phone ? opts.contact : null; // no agent number: fall back to the company line
  L.push("", "For more information please Call/WhatsApp :", c && (c.title ? `${c.name} | ${c.title}` : c.name), "Axe Realty", (c ?? COMPANY).phone, "www.axerealty.lk");

  // drop empty data lines but keep the deliberate blank separators
  return L.filter((x) => x === "" || (typeof x === "string" && x.length > 0)).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
