import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { label } from "@/lib/format";

export default function LocationsPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Locations</h1>
          <p className="muted">Areas, their market tier (Colombo 02 is prime core) and website pages.</p>
        </div>
      </div>
      <Suspense fallback={<p className="muted">Loading locations…</p>}>
        <LocList />
      </Suspense>
    </>
  );
}

async function LocList() {
  await connection();
  await requireUser();
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("locations")
    .select("id, name, postal_code, market_tier, slug, province:provinces(name), developments(count), properties(count)")
    .is("deleted_at", null)
    .order("name");
  if (error) return <p className="error">Could not load locations: {error.message}</p>;
  const count = (v: unknown) => (v as { count: number }[] | null)?.[0]?.count ?? 0;
  return (
    <>
      <div className="pager"><strong style={{ color: "var(--ink)" }}>{rows?.length ?? 0} locations</strong></div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">Location</th><th scope="col">Province</th><th scope="col">Postal code</th><th scope="col">Market tier</th><th scope="col">Developments</th><th scope="col">Properties</th><th scope="col">Website page</th></tr></thead>
          <tbody>
            {(rows ?? []).map((l) => (
              <tr key={l.id}>
                <td><Link href={`/locations/${l.id}`} style={{ fontWeight: 600 }}>{l.name}</Link></td>
                <td>{l.province?.name ?? ""}</td>
                <td>{l.postal_code ?? ""}</td>
                <td>{label(l.market_tier)}</td>
                <td>{count(l.developments)}</td>
                <td><Link href={`/properties?location=${l.id}`}>{count(l.properties)}</Link></td>
                <td>{l.slug ? <span className="badge badge-available">Set up</span> : <span className="muted" style={{ fontSize: 13 }}>Not yet</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
