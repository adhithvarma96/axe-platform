import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { label, money } from "@/lib/format";
import { offerDate, type OfferKind, type Terms } from "@/lib/offers";
import { today } from "@/lib/crm";
import { OfferBuilder, type PropertyOption } from "./offer-builder";

export default function NewOfferPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <Builder params={params} />
    </Suspense>
  );
}

async function Builder({ params }: { params: Promise<{ code: string }> }) {
  await connection();
  await requireUser();
  const { code } = await params;
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads")
    .select("id, lead_code, name, company, occupants, move_in_date, looking_for, nationality:countries(name), offers(version)")
    .eq("lead_code", code).is("deleted_at", null).maybeSingle();
  if (!lead) notFound();

  // Properties this lead has viewed, most recent first: those are the ones an offer is made on.
  const { data: viewed } = await supabase.from("viewings")
    .select(`date, property:properties(id, listing_no, property_type, building_name, location:locations(name), unit_number, beds, parking, furnished, asking_rent, rent_currency, asking_sale_price, sale_currency,
      tower_name_legacy, tower:development_towers(name), development:developments(name), owner:owners(name))`)
    .eq("lead_id", lead.id).is("deleted_at", null).order("date", { ascending: false });
  const seen = new Set<string>();
  const properties: PropertyOption[] = [];
  for (const v of viewed ?? []) {
    const p = v.property;
    if (!p || seen.has(p.id)) continue;
    seen.add(p.id);
    const where = p.development?.name || p.building_name
      ? [p.development?.name ?? p.building_name, p.tower?.name ?? p.tower_name_legacy, p.unit_number ? `Unit ${p.unit_number}` : null].filter(Boolean).join(", ")
      : `${label(p.property_type)}${p.location?.name ? ` in ${p.location.name}` : ""} (${p.listing_no})`;
    const parking = p.parking != null ? `${p.parking} slot${p.parking === 1 ? "" : "s"}` : "";
    properties.push({
      id: p.id, listingNo: p.listing_no ?? "", label: [p.development?.name ?? p.location?.name, p.beds != null ? `${p.beds} bed` : null].filter(Boolean).join(" · "),
      rental: { property: where, landlord: p.owner?.name ?? "", monthly_rent: money(p.asking_rent, p.rent_currency), furnishing: label(p.furnished), parking },
      sale: { property: where, seller: p.owner?.name ?? "", offer_price: money(p.asking_sale_price, p.sale_currency), inclusions: parking ? `${parking}, fixtures and fittings as inspected` : "" },
    });
  }
  const nat = (lead.nationality as { name: string } | null)?.name ?? "";
  const leadTerms: { rental: Terms; sale: Terms } = {
    rental: { tenant: lead.name, occupants: lead.occupants ? String(lead.occupants) : "", start_date: lead.move_in_date ? offerDate(lead.move_in_date) : "", nationality: nat, employer: lead.company ?? "" },
    sale: { buyer: lead.name, nationality: nat },
  };
  const version = Math.max(0, ...(lead.offers ?? []).map((o) => o.version)) + 1;
  const nextRef = version === 1 ? lead.lead_code! : `${lead.lead_code}-O${version}`;
  const kind: OfferKind = lead.looking_for === "buy" ? "sale" : "rental";

  return (
    <>
      <nav className="muted" style={{ fontSize: 13 }}><Link href="/leads">Leads</Link> › <Link href={`/leads/${lead.lead_code}`}>{lead.name}</Link> › Offer</nav>
      <div className="page-head">
        <div>
          <h1>{version === 1 ? "New offer" : `Revised offer (version ${version})`}</h1>
          <p className="muted">On the Axe Realty template. Offer ref {nextRef}; subject to contract.</p>
        </div>
      </div>
      {!properties.length && <p className="muted panel" style={{ margin: 0 }}>This lead has no viewings logged, so there is no property to pre-fill from. You can still write the offer, or log the viewing first.</p>}
      <OfferBuilder leadId={lead.id} nextRef={nextRef} today={today()} defaultKind={kind} properties={properties} leadTerms={leadTerms} />
    </>
  );
}
