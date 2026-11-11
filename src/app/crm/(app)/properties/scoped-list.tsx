import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { label, priceLines } from "@/lib/format";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const num = (s: string) => { const n = Number(s.replace(/[, ]/g, "")); return s && Number.isFinite(n) && n >= 0 ? n : null; };
const STATUSES = ["available", "reserved", "rented", "sold", "withdrawn"] as const;
const PAGE = 50;

/** The properties of one development or location, with quick filters (status, rent/sale, beds, price). */
export async function ScopedProperties({ col, id, sp, path, showDevelopment = false }: {
  col: "development_id" | "location_id"; id: string; sp: SP; path: string; showDevelopment?: boolean;
}) {
  const f = { status: one(sp.status), intent: one(sp.intent), beds: one(sp.beds), rent_max: one(sp.rent_max), sale_max: one(sp.sale_max), sort: one(sp.sort) };
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const supabase = await createClient();
  let q = supabase.from("properties")
    .select("listing_no, status, beds, baths, square_feet, asking_rent, rent_currency, asking_sale_price, sale_currency, unit_number, next_available_date, website_published, tower:development_towers(name), tower_name_legacy, development:developments(name), owner:owners(name)", { count: "exact" })
    .eq(col, id).is("deleted_at", null);
  if (STATUSES.includes(f.status as never)) q = q.eq("status", f.status as (typeof STATUSES)[number]);
  if (f.intent === "sale") q = q.contains("listing_types", ["sale"]);
  if (f.intent === "rent") q = q.overlaps("listing_types", ["rent_long_term", "rent_short_term"]);
  if (f.beds) q = f.beds === "4" ? q.gte("beds", 4) : q.eq("beds", Number(f.beds));
  const rentMax = num(f.rent_max), saleMax = num(f.sale_max);
  if (rentMax != null) q = q.lte("asking_rent", rentMax);
  if (saleMax != null) q = q.lte("asking_sale_price", saleMax);
  if (f.sort === "rent_asc" || f.sort === "rent_desc") q = q.order("asking_rent", { ascending: f.sort === "rent_asc", nullsFirst: false });
  else if (f.sort === "sqft_desc") q = q.order("square_feet", { ascending: false, nullsFirst: false });
  q = q.order("status").order("listing_no").range((page - 1) * PAGE, page * PAGE - 1);
  const { data: rows, count, error } = await q;
  if (error) return <p className="error">Could not load properties: {error.message}</p>;
  const total = count ?? 0, pages = Math.max(1, Math.ceil(total / PAGE));
  const set = Object.entries(f).filter(([, v]) => v);
  const href = (p: number) => `${path}?${new URLSearchParams({ ...Object.fromEntries(set), ...(p > 1 ? { page: String(p) } : {}) })}#properties`;

  return (
    <section className="panel" id="properties" style={{ display: "flex", flexDirection: "column", gap: 12, scrollMarginTop: 12 }}>
      <h2 className="section-title" style={{ margin: 0 }}>Properties ({total.toLocaleString()}{set.length ? " matching" : ""})</h2>
      <form action={`${path}#properties`} className="filters" style={{ padding: 0, border: 0, background: "none" }}>
        <div className="field" style={{ flex: "0 1 150px" }}>
          <label htmlFor="sc-status">Availability</label>
          <select id="sc-status" name="status" defaultValue={f.status}>
            <option value="">Any</option>
            {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </div>
        <div className="field" style={{ flex: "0 1 130px" }}>
          <label htmlFor="sc-intent">Rent / sale</label>
          <select id="sc-intent" name="intent" defaultValue={f.intent}><option value="">Any</option><option value="rent">For rent</option><option value="sale">For sale</option></select>
        </div>
        <div className="field" style={{ flex: "0 1 100px" }}>
          <label htmlFor="sc-beds">Beds</label>
          <select id="sc-beds" name="beds" defaultValue={f.beds}><option value="">Any</option><option value="0">Studio</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4+</option></select>
        </div>
        <div className="field" style={{ flex: "0 1 130px" }}><label htmlFor="sc-rent">Max rent</label><input id="sc-rent" name="rent_max" inputMode="numeric" defaultValue={f.rent_max} /></div>
        <div className="field" style={{ flex: "0 1 150px" }}><label htmlFor="sc-sale">Max sale price</label><input id="sc-sale" name="sale_max" inputMode="numeric" defaultValue={f.sale_max} /></div>
        <div className="field" style={{ flex: "0 1 170px" }}>
          <label htmlFor="sc-sort">Sort</label>
          <select id="sc-sort" name="sort" defaultValue={f.sort}><option value="">Status, then listing</option><option value="rent_asc">Rent, low to high</option><option value="rent_desc">Rent, high to low</option><option value="sqft_desc">Largest first</option></select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-sm" type="submit">Filter</button>
          {set.length > 0 && <Link className="btn btn-ghost btn-sm" href={`${path}#properties`}>Clear</Link>}
        </div>
      </form>
      {rows?.length ? (
        <div className="table-wrap" style={{ border: 0 }}>
          <table className="table">
            <thead><tr><th scope="col">Listing</th><th scope="col">{showDevelopment ? "Development · tower · unit" : "Tower · unit"}</th><th scope="col">Beds · sq ft</th><th scope="col">Price</th><th scope="col">Owner</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.listing_no}>
                  <td><Link href={`/properties/${p.listing_no}`} style={{ fontWeight: 700 }}>{p.listing_no}</Link></td>
                  <td>{[showDevelopment ? p.development?.name : null, p.tower?.name ?? p.tower_name_legacy, p.unit_number ? `Unit ${p.unit_number}` : null].filter(Boolean).join(" · ") || "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{p.beds ?? "–"} bed{p.square_feet ? ` · ${Math.round(p.square_feet).toLocaleString()} sq ft` : ""}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{priceLines(p).join(" · ")}</td>
                  <td>{p.owner?.name ?? <span className="muted">—</span>}</td>
                  <td>
                    <span className={`badge badge-${p.status}`}>{label(p.status)}</span>
                    {p.status === "rented" && p.next_available_date && <div className="muted" style={{ fontSize: 12 }}>free {p.next_available_date}</div>}
                    {p.website_published && <span className="badge badge-live" style={{ marginLeft: 6 }}>Live</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="muted" style={{ margin: 0 }}>{set.length ? "No properties match these filters." : "No properties here yet."}</p>}
      {pages > 1 && (
        <nav className="pager" aria-label="Pages">
          {page > 1 ? <Link className="btn btn-ghost btn-sm" href={href(page - 1)}>← Previous</Link> : <span />}
          <span className="muted">Page {page} of {pages}</span>
          {page < pages ? <Link className="btn btn-ghost btn-sm" href={href(page + 1)}>Next →</Link> : <span />}
        </nav>
      )}
    </section>
  );
}
