import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { label, priceLines } from "@/lib/format";

const PAGE = 50;
const STATUSES = ["available", "reserved", "rented", "sold", "withdrawn"] as const;
const TYPES = ["apartment", "house", "land", "villa", "commercial"] as const;

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function PropertiesPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Properties</h1>
          <p className="muted">Every listing in the database. Click a row to open it.</p>
        </div>
      </div>
      <Suspense fallback={<p className="muted">Loading properties…</p>}>
        <PropertyList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function PropertyList({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  await requireUser();
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const status = one(sp.status);
  const type = one(sp.type);
  const loc = one(sp.location);
  const beds = one(sp.beds);
  const intent = one(sp.intent);
  const published = one(sp.published);
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const supabase = await createClient();
  const { data: locations } = await supabase.from("locations").select("id, name").is("deleted_at", null).order("name");

  let query = supabase
    .from("properties")
    .select(
      "id, listing_no, property_type, status, listing_types, beds, baths, square_feet, asking_rent, rent_currency, asking_sale_price, sale_currency, website_published, development:developments(name), location:locations(name), photos:property_photos(variants, is_cover)",
      { count: "exact" },
    )
    .is("deleted_at", null)
    .order("seq_no", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);

  if (q) {
    if (/^ax/i.test(q)) query = query.ilike("listing_no", `%${q}%`);
    else {
      const { data: devs } = await supabase.from("developments").select("id").ilike("name", `%${q}%`).limit(50);
      const ids = (devs ?? []).map((d) => d.id);
      query = ids.length ? query.in("development_id", ids) : query.eq("id", "00000000-0000-0000-0000-000000000000");
    }
  }
  if (STATUSES.includes(status as never)) query = query.eq("status", status as (typeof STATUSES)[number]);
  if (TYPES.includes(type as never)) query = query.eq("property_type", type as (typeof TYPES)[number]);
  if (loc) query = query.eq("location_id", loc);
  if (beds) query = beds === "4" ? query.gte("beds", 4) : query.eq("beds", Number(beds));
  if (intent === "sale") query = query.contains("listing_types", ["sale"]);
  if (intent === "rent") query = query.overlaps("listing_types", ["rent_long_term", "rent_short_term"]);
  if (published === "yes") query = query.eq("website_published", true);
  if (published === "no") query = query.eq("website_published", false);

  const { data: rows, count, error } = await query;
  if (error) return <p className="error">Could not load properties: {error.message}</p>;
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (p: number) => {
    const u = new URLSearchParams();
    Object.entries({ q, status, type, location: loc, beds, intent, published }).forEach(([k, v]) => v && u.set(k, v));
    if (p > 1) u.set("page", String(p));
    return `/properties${u.size ? `?${u}` : ""}`;
  };

  return (
    <>
      <form className="panel filters" action="/properties">
        <div className="field" style={{ flex: "2 1 220px" }}>
          <label htmlFor="q">Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="Listing no (AX26…) or development" />
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status}>
            <option value="">Any</option>
            {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="intent">Rent / sale</label>
          <select id="intent" name="intent" defaultValue={intent}>
            <option value="">Any</option>
            <option value="rent">For rent</option>
            <option value="sale">For sale</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="type">Type</label>
          <select id="type" name="type" defaultValue={type}>
            <option value="">Any</option>
            {TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="location">Location</label>
          <select id="location" name="location" defaultValue={loc}>
            <option value="">Any</option>
            {(locations ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ flex: "0 1 110px" }}>
          <label htmlFor="beds">Beds</label>
          <select id="beds" name="beds" defaultValue={beds}>
            <option value="">Any</option>
            {["1", "2", "3"].map((b) => <option key={b} value={b}>{b}</option>)}
            <option value="4">4+</option>
          </select>
        </div>
        <div className="field" style={{ flex: "0 1 130px" }}>
          <label htmlFor="published">On website</label>
          <select id="published" name="published" defaultValue={published}>
            <option value="">Any</option>
            <option value="yes">Published</option>
            <option value="no">Not published</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" type="submit">Filter</button>
          <Link className="btn btn-ghost" href="/properties">Reset</Link>
        </div>
      </form>

      <div className="pager">
        <strong style={{ color: "var(--ink)" }}>{total.toLocaleString()} {total === 1 ? "property" : "properties"}</strong>
        <span className="muted">Page {page} of {pages}</span>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Photo</span></th>
              <th scope="col">Listing</th>
              <th scope="col">Development · Location</th>
              <th scope="col">Beds / baths · sq ft</th>
              <th scope="col">Price</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((p) => {
              const cover = p.photos?.find((ph) => ph.is_cover) ?? p.photos?.[0];
              const thumb = (cover?.variants as Record<string, { url: string }> | null)?.["400"]?.url;
              return (
                <tr key={p.id}>
                  <td>
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="thumb" src={thumb} alt="" loading="lazy" />
                    ) : (
                      <span className="thumb" aria-hidden="true" />
                    )}
                  </td>
                  <td>
                    <Link href={`/properties/${p.listing_no}`} style={{ fontWeight: 700 }}>{p.listing_no}</Link>
                    <div className="muted" style={{ fontSize: 12 }}>{label(p.property_type)} · {(p.listing_types ?? []).map(label).join(", ")}</div>
                  </td>
                  <td>
                    <div style={{ color: "var(--ink)", fontWeight: 500 }}>{p.development?.name ?? "—"}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{p.location?.name ?? ""}</div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {p.beds ?? "–"} / {p.baths ?? "–"}
                    <div className="muted" style={{ fontSize: 12 }}>{p.square_feet ? `${Math.round(p.square_feet).toLocaleString()} sq ft` : ""}</div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{priceLines(p).map((l) => <div key={l}>{l}</div>)}</td>
                  <td>
                    <span className={`badge badge-${p.status}`}>{label(p.status)}</span>
                    {p.website_published && <span className="badge badge-live" style={{ marginLeft: 6 }}>Live</span>}
                  </td>
                </tr>
              );
            })}
            {!rows?.length && (
              <tr><td colSpan={6} className="muted" style={{ padding: 24 }}>No properties match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="pager" aria-label="Pages">
          {page > 1 ? <Link className="btn btn-ghost btn-sm" href={link(page - 1)}>← Previous</Link> : <span />}
          {page < pages ? <Link className="btn btn-ghost btn-sm" href={link(page + 1)}>Next →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
