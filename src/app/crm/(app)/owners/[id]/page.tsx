import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { label, money, priceLines } from "@/lib/format";

export default function OwnerPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <Owner params={params} />
    </Suspense>
  );
}

async function Owner({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: o } = await supabase
    .from("owners")
    .select(`*, owner_source:owner_sources(name), sourced_by:agents(full_name),
      properties(listing_no, status, beds, asking_rent, rent_currency, asking_sale_price, sale_currency, development:developments(name)),
      buying_locations:owner_buying_locations(location:locations(name))`)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!o) notFound();
  const rows: [string, React.ReactNode][] = [
    ["Type", label(o.owner_type)], ["Phone", o.primary_phone], ["WhatsApp", o.whatsapp], ["Email", o.email],
    ["Address", o.address], ["Source", o.owner_source?.name], ["Sourced by", o.sourced_by?.full_name],
  ];
  const buying: [string, React.ReactNode][] = [
    ["Investor type", label(o.investor_type)], ["Looking for", label(o.buying_looking_for)],
    ["Property types", (o.buying_property_types ?? []).map(label).join(", ")],
    ["Areas", (o.buying_locations ?? []).map((b) => b.location?.name).filter(Boolean).join(", ")],
    ["Budget", [money(o.buying_budget_min, o.buying_budget_currency), money(o.buying_budget_max, o.buying_budget_currency)].filter(Boolean).join(" – ")],
    ["Notes", o.buying_notes],
  ];
  const show = (r: [string, React.ReactNode][]) => r.filter(([, v]) => v);

  return (
    <>
      <nav className="muted" style={{ fontSize: 13 }}><Link href="/owners">Owners</Link> › {o.name}</nav>
      <div className="page-head"><h1>{o.name}</h1>{o.open_to_buying && <span className="badge">Open to buying</span>}</div>
      {o.contact_protocol && <p className="protocol">Contact protocol: {label(o.contact_protocol)}{o.contact_notes ? ` · ${o.contact_notes}` : ""}</p>}
      <div className="grid-2">
        <section className="panel">
          <h2 className="section-title">Details</h2>
          <dl className="facts">{show(rows).map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          {o.notes && <p style={{ marginTop: 12, whiteSpace: "pre-line" }}>{o.notes}</p>}
        </section>
        {o.open_to_buying && (
          <section className="panel">
            <h2 className="section-title">Buying profile</h2>
            <dl className="facts">{show(buying).map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          </section>
        )}
      </div>
      <section className="panel">
        <h2 className="section-title">Properties ({o.properties?.length ?? 0})</h2>
        {o.properties?.length ? (
          <div className="table-wrap" style={{ border: 0 }}>
            <table className="table">
              <thead><tr><th scope="col">Listing</th><th scope="col">Development</th><th scope="col">Beds</th><th scope="col">Price</th><th scope="col">Status</th></tr></thead>
              <tbody>
                {o.properties.map((p) => (
                  <tr key={p.listing_no}>
                    <td><Link href={`/properties/${p.listing_no}`} style={{ fontWeight: 700 }}>{p.listing_no}</Link></td>
                    <td>{p.development?.name ?? "—"}</td>
                    <td>{p.beds ?? "–"}</td>
                    <td>{priceLines(p).join(" · ")}</td>
                    <td><span className={`badge badge-${p.status}`}>{label(p.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted">No properties linked.</p>}
      </section>
    </>
  );
}
