import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { date, label } from "@/lib/format";
import { groupStats, usd, type ClosingPoint } from "@/lib/closing-stats";

/** Closed deals in one development or location, with rent/price per sq ft. Admins only (closings are). */
export async function ClosingHistory({ by, id }: { by: "development" | "location"; id: string }) {
  const user = await getCurrentUser();
  if (user?.role !== "super_admin") return null; // Super Admin only for now (Adhith, 11 Nov)
  const supabase = await createClient();
  const { data } = await supabase.from("closings")
    .select(`closing_no, closing_date, deal_type, monthly_rent_usd, total_deal_value_usd,
      property:properties!inner(listing_no, beds, square_feet, development_id, location_id, development:developments(name), tower:development_towers(name))`)
    .is("deleted_at", null)
    .eq(by === "development" ? "property.development_id" : "property.location_id", id)
    .order("closing_date", { ascending: false });
  const rows = data ?? [];
  const points: ClosingPoint[] = rows.map((c) => ({
    date: c.closing_date, kind: c.deal_type, amountUsd: c.deal_type === "sale" ? c.total_deal_value_usd : c.monthly_rent_usd,
    sqft: c.property.square_feet, location: null, development: null, beds: c.property.beds,
  }));
  const rent = groupStats(points, "rental", "beds");
  return (
    <section className="panel" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
        <h2 className="section-title" style={{ margin: 0 }}>Our closings here ({rows.length})</h2>
        <Link href="/closings/insights" className="muted" style={{ fontSize: 13 }}>All closing insights →</Link>
      </div>
      {!rows.length ? <p className="muted" style={{ margin: 0 }}>No closings recorded here yet.</p> : (
        <>
          {rent.length > 0 && (
            <div className="kpis" style={{ margin: 0 }}>
              {rent.map((r) => (
                <div key={r.key} className="kpi">
                  <span>{r.key} rent · {r.deals} deal{r.deals === 1 ? "" : "s"}</span>
                  <b style={{ fontSize: 20 }}>{usd(r.median)}<small>/mo median</small></b>
                  <small>{r.psfAvg != null ? `${usd(r.psfAvg, 2)} per sq ft` : "No sizes recorded"}</small>
                </div>
              ))}
            </div>
          )}
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th scope="col">Closed</th><th scope="col">Type</th><th scope="col">Listing</th><th scope="col">Beds</th><th scope="col">Sq ft</th><th scope="col">Rent / price</th><th scope="col">Per sq ft</th></tr></thead>
              <tbody>
                {rows.map((c) => {
                  const amt = c.deal_type === "sale" ? c.total_deal_value_usd : c.monthly_rent_usd;
                  const sq = c.property.square_feet;
                  return (
                    <tr key={c.closing_no}>
                      <td style={{ whiteSpace: "nowrap" }}><Link href={`/closings/${c.closing_no}`}>{date(c.closing_date)}</Link></td>
                      <td>{label(c.deal_type)}</td>
                      <td><Link href={`/properties/${c.property.listing_no}`}>{c.property.listing_no}</Link>{by === "location" && c.property.development ? <span className="muted"> · {c.property.development.name}</span> : c.property.tower ? <span className="muted"> · {c.property.tower.name}</span> : null}</td>
                      <td>{c.property.beds ?? "–"}</td>
                      <td>{sq ? Math.round(sq).toLocaleString() : "–"}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{usd(amt)}{c.deal_type === "sale" ? "" : "/mo"}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{amt && sq ? usd(amt / sq, c.deal_type === "sale" ? 0 : 2) : "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
