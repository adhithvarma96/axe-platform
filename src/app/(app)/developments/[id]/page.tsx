import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { label, priceLines } from "@/lib/format";

export default function DevelopmentPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <Development params={params} />
    </Suspense>
  );
}

async function Development({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: d } = await supabase
    .from("developments")
    .select(`*, location:locations(name), towers:development_towers(id, name),
      properties(listing_no, status, beds, square_feet, asking_rent, rent_currency, asking_sale_price, sale_currency, tower:development_towers(name))`)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!d) notFound();
  const props = (d.properties ?? []).sort((a, b) => (a.listing_no ?? "").localeCompare(b.listing_no ?? ""));
  const facts: [string, React.ReactNode][] = [
    ["Location", d.location?.name], ["Developer", d.developer_builder], ["Status", label(d.development_status)],
    ["Completed", d.year_completed], ["Total units", d.total_units], ["Towers / blocks", d.towers_blocks],
    ["Website address", d.slug ? `/development/${d.slug}/` : "Not set up yet"],
  ];

  return (
    <>
      <nav className="muted" style={{ fontSize: 13 }}><Link href="/developments">Developments</Link> › {d.name}</nav>
      <div className="page-head"><h1>{d.name}</h1></div>
      <div className="grid-2">
        <section className="panel">
          <h2 className="section-title">Details</h2>
          <dl className="facts">{facts.filter(([, v]) => v).map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          {d.notes && <p style={{ marginTop: 12, whiteSpace: "pre-line" }}>{d.notes}</p>}
        </section>
        <section className="panel">
          <h2 className="section-title">Towers ({d.towers?.length ?? 0})</h2>
          {d.towers?.length ? <p>{d.towers.map((t) => t.name).sort().join(" · ")}</p> : <p className="muted">No towers recorded.</p>}
        </section>
      </div>
      <section className="panel">
        <h2 className="section-title">Properties ({props.length})</h2>
        {props.length ? (
          <div className="table-wrap" style={{ border: 0 }}>
            <table className="table">
              <thead><tr><th scope="col">Listing</th><th scope="col">Tower</th><th scope="col">Beds</th><th scope="col">Sq ft</th><th scope="col">Price</th><th scope="col">Status</th></tr></thead>
              <tbody>
                {props.map((p) => (
                  <tr key={p.listing_no}>
                    <td><Link href={`/properties/${p.listing_no}`} style={{ fontWeight: 700 }}>{p.listing_no}</Link></td>
                    <td>{p.tower?.name ?? ""}</td>
                    <td>{p.beds ?? "–"}</td>
                    <td>{p.square_feet ? Math.round(p.square_feet).toLocaleString() : ""}</td>
                    <td>{priceLines(p).join(" · ")}</td>
                    <td><span className={`badge badge-${p.status}`}>{label(p.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted">No properties in this development yet.</p>}
      </section>
    </>
  );
}
