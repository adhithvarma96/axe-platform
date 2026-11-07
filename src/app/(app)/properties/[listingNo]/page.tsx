import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { date, label, money, priceLines } from "@/lib/format";

type Variants = Record<string, { url: string; width: number; height: number }>;

export default function PropertyPage({ params }: { params: Promise<{ listingNo: string }> }) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <Property params={params} />
    </Suspense>
  );
}

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== false);
  if (!shown.length) return <p className="muted">Nothing recorded yet.</p>;
  return (
    <dl className="facts">
      {shown.map(([k, v]) => (
        <div key={k} style={{ display: "contents" }}>
          <dt>{k}</dt>
          <dd>{v === true ? "Yes" : v}</dd>
        </div>
      ))}
    </dl>
  );
}

async function Property({ params }: { params: Promise<{ listingNo: string }> }) {
  await connection();
  const user = await requireUser();
  const { listingNo } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("properties")
    .select(
      `*, development:developments(name), location:locations(name), tower:development_towers(name),
       owner:owners(id, name, primary_phone, whatsapp, email, contact_protocol, contact_notes),
       listing_agent:agents!properties_listing_agent_id_fkey(full_name),
       referral_partner:referral_partners(full_name),
       source_channel:source_channels(name),
       features:property_feature_links(feature:property_features(name)),
       photos:property_photos(id, variants, is_cover, sort_order, original_filename)`,
    )
    .eq("listing_no", decodeURIComponent(listingNo).toUpperCase())
    .is("deleted_at", null)
    .maybeSingle();
  if (!p) notFound();

  const photos = (p.photos ?? []).sort((a, b) => a.sort_order - b.sort_order);
  const { data: history } = await supabase
    .from("price_history")
    .select("field, old_amount, old_currency, new_amount, new_currency, changed_at")
    .eq("property_id", p.id)
    .order("changed_at", { ascending: false })
    .limit(10);
  const features = (p.features ?? []).map((f) => f.feature?.name).filter(Boolean).join(", ");
  const t = p.property_type;

  return (
    <>
      <nav className="muted" style={{ fontSize: 13 }}>
        <Link href="/properties">Properties</Link> › {p.listing_no}
      </nav>
      <div className="page-head">
        <div>
          <h1>{p.listing_no} · {p.development?.name ?? label(p.property_type)}</h1>
          <p className="muted">
            {[label(p.property_type), p.location?.name, p.beds != null ? `${p.beds} bed` : null, p.square_feet ? `${Math.round(p.square_feet).toLocaleString()} sq ft` : null].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className={`badge badge-${p.status}`}>{label(p.status)}</span>
          <span className={`badge ${p.website_published ? "badge-live" : ""}`}>{p.website_published ? "On website" : "Not on website"}</span>
        </div>
      </div>

      <section className="panel">
        <h2 className="section-title">Photos ({photos.length})</h2>
        {photos.length ? (
          <div className="gallery">
            {photos.map((ph, i) => {
              const v = ph.variants as Variants | null;
              return (
                <figure key={ph.id} style={{ margin: 0, position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v?.["400"]?.url} alt={`Photo ${i + 1} of ${p.listing_no}`} loading="lazy" />
                  {ph.is_cover && <span className="badge badge-live" style={{ position: "absolute", top: 6, left: 6 }}>Cover</span>}
                </figure>
              );
            })}
          </div>
        ) : (
          <p className="muted">No photos yet.{p.photos_link ? " They can be imported from the Drive folder." : ""}</p>
        )}
        {p.photos_link && <p style={{ marginTop: 10, fontSize: 13 }}><a href={p.photos_link} target="_blank" rel="noreferrer">Open Drive folder ↗</a></p>}
      </section>

      <div className="grid-2">
        <section className="panel">
          <h2 className="section-title">Pricing &amp; availability</h2>
          <Facts rows={[
            ["Asking", priceLines(p).join(" · ") || "Price on request"],
            ["Listing types", (p.listing_types ?? []).map(label).join(", ")],
            ["Available from", date(p.available_from)],
            ["Next available", date(p.next_available_date)],
            ["Last made available", date(p.last_made_available)],
            ["Last verified", date(p.last_verified)],
            ["Listing date", date(p.listing_date)],
          ]} />
          {!!history?.length && (
            <>
              <h3 style={{ fontSize: 15, margin: "16px 0 8px" }}>Price history</h3>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {history.map((h, i) => (
                  <li key={i}>{date(h.changed_at)}: {h.field === "asking_rent" ? "rent" : "sale"} {money(h.old_amount, h.old_currency) || "none"} → {money(h.new_amount, h.new_currency) || "none"}</li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="panel">
          <h2 className="section-title">Owner</h2>
          {p.owner ? (
            <>
              {p.owner.contact_protocol && <p className="protocol" style={{ marginBottom: 12 }}>Contact protocol: {label(p.owner.contact_protocol)}</p>}
              <Facts rows={[
                ["Name", <Link key="o" href={`/owners/${p.owner.id}`}>{p.owner.name}</Link>],
                ["Phone", p.owner.primary_phone],
                ["WhatsApp", p.owner.whatsapp],
                ["Email", p.owner.email],
                ["How to approach", p.owner.contact_notes],
              ]} />
            </>
          ) : <p className="muted">No owner linked.</p>}
        </section>

        <section className="panel">
          <h2 className="section-title">The unit</h2>
          <Facts rows={[
            ["Development", p.development?.name], ["Tower", p.tower?.name ?? p.tower_name_legacy], ["Location", p.location?.name],
            ["Unit number", p.unit_number], ["Floor", p.floor], ["Building", p.building_name],
            ["Bedrooms", p.beds], ["Bathrooms", p.baths], ["Parking", p.parking],
            ["Size", p.square_feet ? `${Math.round(p.square_feet).toLocaleString()} sq ft` : null],
            ["Furnished", label(p.furnished)], ["Condition", label(p.condition)],
            ["Features", features], ["Maid's room", p.maids_room], ["Maid's bath", p.maids_bath],
            ["Expected completion", date(p.expected_completion_date)],
          ]} />
        </section>

        <section className="panel">
          <h2 className="section-title">Sourcing</h2>
          <Facts rows={[
            ["Listing agent", p.listing_agent?.full_name], ["Sourcing model", label(p.sourcing_model)],
            ["Referral partner", p.referral_partner?.full_name], ["Source channel", p.source_channel?.name],
            ["Listing source", label(p.listing_source_type)], ["Commission structure", p.commission_structure],
            ["Bulk import (not counted as sourced)", p.is_bulk_import],
          ]} />
        </section>

        {(t === "house" || t === "villa") && (
          <section className="panel">
            <h2 className="section-title">House &amp; villa</h2>
            <Facts rows={[
              ["Land extent", p.land_extent_perches ? `${p.land_extent_perches} perches` : null], ["Built-up area", p.built_up_area_sqft ? `${p.built_up_area_sqft} sq ft` : null],
              ["Floors", p.number_of_floors], ["Garden", p.garden], ["Garden size", p.garden_size_perches ? `${p.garden_size_perches} perches` : null],
              ["Servant quarters", p.servant_quarters], ["Boundary wall", p.boundary_wall], ["Water", label(p.water_source)],
              ["Roof", p.roof_type], ["Generator", p.generator], ["Pool", p.pool], ["Pool size", label(p.pool_size)],
              ["Sea view", p.sea_view], ["Beach access", p.beach_access], ["Daily rate", money(p.daily_rate, p.daily_rate_currency)],
              ["Minimum stay", p.minimum_stay_nights ? `${p.minimum_stay_nights} nights` : null], ["Max occupancy", p.max_occupancy],
            ]} />
          </section>
        )}
        {t === "land" && (
          <section className="panel">
            <h2 className="section-title">Land</h2>
            <Facts rows={[
              ["Extent", p.land_extent_perches ? `${p.land_extent_perches} perches` : null], ["Frontage", p.frontage_ft ? `${p.frontage_ft} ft` : null],
              ["Depth", p.depth_ft ? `${p.depth_ft} ft` : null], ["Shape", label(p.land_shape)], ["Category", label(p.land_category)],
              ["Title", label(p.title_type)], ["Road access", p.road_access_width_ft ? `${p.road_access_width_ft} ft` : null],
              ["Beachfront", p.beachfront], ["Distance to sea", p.distance_to_sea_ft ? `${p.distance_to_sea_ft} ft` : null],
              ["Electricity", p.electricity_available], ["Water mains", p.water_mains_available], ["Telecom", p.telecom_available], ["Subdivided", p.subdivided],
            ]} />
          </section>
        )}
        {t === "commercial" && (
          <section className="panel">
            <h2 className="section-title">Commercial</h2>
            <Facts rows={[
              ["Sub-category", label(p.commercial_sub_category)], ["Floor area", p.total_floor_area_sqft ? `${p.total_floor_area_sqft} sq ft` : null],
              ["Grade", p.building_grade?.toUpperCase()], ["Service charge", money(p.service_charge_lkr, "LKR")], ["Floors available", p.floors_available],
              ["Workstations", p.workstation_capacity], ["Conference rooms", p.conference_rooms], ["Air conditioning", label(p.air_conditioning)],
              ["Floor", label(p.shared_or_dedicated)], ["Storefront", label(p.storefront_type)], ["Foot traffic", label(p.foot_traffic)],
              ["Ceiling height", p.ceiling_height_ft ? `${p.ceiling_height_ft} ft` : null], ["Loading docks", p.loading_docks],
              ["Three-phase power", p.three_phase_power], ["Bulk lease", p.bulk_lease_available],
            ]} />
          </section>
        )}

        <section className="panel">
          <h2 className="section-title">Distribution</h2>
          <Facts rows={[
            ["Axe website", p.website_published ? "Published" : "Not published"],
            ["LankaPropertyWeb", p.lanka_property_web_posted], ["ikman.lk", p.ikman_posted],
            ["Realtor WhatsApp groups", p.realtor_wa_groups_posted], ["Google indexed", p.google_indexed],
          ]} />
        </section>

        <section className="panel">
          <h2 className="section-title">Notes</h2>
          <h3 style={{ fontSize: 14, margin: "0 0 4px" }}>Public notes <span className="muted" style={{ fontWeight: 400 }}>(the only text that can appear on the website)</span></h3>
          <p style={{ whiteSpace: "pre-line", marginBottom: 14 }}>{p.public_notes || <span className="muted">None</span>}</p>
          <h3 style={{ fontSize: 14, margin: "0 0 4px" }}>Internal notes</h3>
          <p style={{ whiteSpace: "pre-line" }}>{p.internal_notes || <span className="muted">None</span>}</p>
          {p.map_pin && <p style={{ marginTop: 10, fontSize: 13 }}><a href={p.map_pin} target="_blank" rel="noreferrer">Map pin ↗</a> <span className="muted">(internal only)</span></p>}
        </section>
      </div>
      {user.role === "super_admin" && <p className="muted" style={{ fontSize: 12 }}>Editing, photo upload and the publish switch come in the next step.</p>}
    </>
  );
}
