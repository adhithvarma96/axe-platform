import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { label, priceLines } from "@/lib/format";

const PAGE = 50;
const STATUSES = ["available", "reserved", "rented", "sold", "withdrawn"] as const;
const TYPES = ["apartment", "house", "land", "villa", "commercial"] as const;
const SORTS: [string, string][] = [["new", "Newest first"], ["sqft_desc", "Largest first"], ["sqft_asc", "Smallest first"], ["rent_asc", "Rent, low to high"], ["rent_desc", "Rent, high to low"], ["sale_asc", "Sale price, low to high"], ["sale_desc", "Sale price, high to low"]];
const NONE = "00000000-0000-0000-0000-000000000000";
// Every filter the page understands; the advanced ones open the "More filters" panel when set.
const KEYS = ["q", "status", "intent", "type", "location", "beds", "published", "development", "tower", "unit", "owner", "agent", "via", "sqft_min", "sqft_max", "rent_max", "sale_max", "sort"] as const;
const ADVANCED = ["development", "tower", "unit", "owner", "agent", "via", "sqft_min", "sqft_max", "rent_max", "sale_max", "sort"];

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const clean = (s: string) => s.replace(/[,()*%\\]/g, " ").trim(); // safe inside a PostgREST or() filter
const num = (s: string) => { const n = Number(s.replace(/[, ]/g, "")); return s && Number.isFinite(n) && n >= 0 ? n : null; };

export default function PropertiesPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Properties</h1>
          <p className="muted">Every listing in the database. Search by anything you know about the unit.</p>
        </div>
        <Link className="btn" href="/properties/new">+ Add property</Link>
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
  const f = Object.fromEntries(KEYS.map((k) => [k, one(sp[k]).trim()])) as Record<(typeof KEYS)[number], string>;
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const supabase = await createClient();
  const [locQ, devQ, agentQ, extQ] = await Promise.all([
    supabase.from("locations").select("id, name").is("deleted_at", null).order("name"),
    supabase.from("developments").select("id, name").is("deleted_at", null).order("name"),
    supabase.from("agents").select("id, full_name, status").is("deleted_at", null).order("status").order("full_name"),
    supabase.from("external_agents").select("id, agent_name, company").is("deleted_at", null).order("agent_name"),
  ]);

  let query = supabase
    .from("properties")
    .select(
      `id, listing_no, property_type, status, listing_types, beds, baths, square_feet, asking_rent, rent_currency, asking_sale_price, sale_currency, website_published,
       unit_number, building_name, tower_name_legacy, development:developments(name), tower:development_towers(name), location:locations(name),
       owner:owners(name), listing_agent:agents!properties_listing_agent_id_fkey(full_name), photos:property_photos(variants, is_cover)`,
      { count: "exact" },
    )
    .is("deleted_at", null);

  // Free search: listing no, unit, building, tower, development or owner name/phone.
  const q = clean(f.q);
  if (q) {
    const like = `%${q}%`;
    const [devs, towers, owners] = await Promise.all([
      supabase.from("developments").select("id").ilike("name", like).limit(100),
      supabase.from("development_towers").select("id").ilike("name", like).limit(100),
      supabase.from("owners").select("id").or(`name.ilike.${like},primary_phone.ilike.${like}`).is("deleted_at", null).limit(300),
    ]);
    const ors = [`listing_no.ilike.${like}`, `unit_number.ilike.${like}`, `building_name.ilike.${like}`, `tower_name_legacy.ilike.${like}`];
    const ids = (r: { data: { id: string }[] | null }) => (r.data ?? []).map((x) => x.id).join(",");
    if (devs.data?.length) ors.push(`development_id.in.(${ids(devs)})`);
    if (towers.data?.length) ors.push(`tower_id.in.(${ids(towers)})`);
    if (owners.data?.length) ors.push(`owner_id.in.(${ids(owners)})`);
    query = query.or(ors.join(","));
  }
  if (STATUSES.includes(f.status as never)) query = query.eq("status", f.status as (typeof STATUSES)[number]);
  if (TYPES.includes(f.type as never)) query = query.eq("property_type", f.type as (typeof TYPES)[number]);
  if (f.location) query = query.eq("location_id", f.location);
  if (f.beds) query = f.beds === "4" ? query.gte("beds", 4) : query.eq("beds", Number(f.beds));
  if (f.intent === "sale") query = query.contains("listing_types", ["sale"]);
  if (f.intent === "rent") query = query.overlaps("listing_types", ["rent_long_term", "rent_short_term"]);
  if (f.published === "yes") query = query.eq("website_published", true);
  if (f.published === "no") query = query.eq("website_published", false);
  if (f.development) query = query.eq("development_id", f.development);
  if (f.unit) query = query.ilike("unit_number", `%${clean(f.unit)}%`);
  if (f.tower) {
    const t = clean(f.tower);
    const { data: tw } = await supabase.from("development_towers").select("id").ilike("name", `%${t}%`).limit(100);
    query = query.or([`tower_name_legacy.ilike.%${t}%`, ...(tw?.length ? [`tower_id.in.(${tw.map((x) => x.id).join(",")})`] : [])].join(","));
  }
  if (f.owner) {
    const o = clean(f.owner);
    const { data: ow } = await supabase.from("owners").select("id").or(`name.ilike.%${o}%,primary_phone.ilike.%${o}%,email.ilike.%${o}%`).is("deleted_at", null).limit(500);
    query = query.in("owner_id", ow?.length ? ow.map((x) => x.id) : [NONE]);
  }
  if (f.agent === "none") query = query.is("listing_agent_id", null);
  else if (f.agent) query = query.eq("listing_agent_id", f.agent);
  if (f.via) {
    const { data: links } = await supabase.from("property_source_external_agents").select("property_id").eq("external_agent_id", f.via);
    query = query.in("id", links?.length ? links.map((x) => x.property_id) : [NONE]);
  }
  const sqMin = num(f.sqft_min), sqMax = num(f.sqft_max), rentMax = num(f.rent_max), saleMax = num(f.sale_max);
  if (sqMin != null) query = query.gte("square_feet", sqMin);
  if (sqMax != null) query = query.lte("square_feet", sqMax);
  if (rentMax != null) query = query.lte("asking_rent", rentMax);
  if (saleMax != null) query = query.lte("asking_sale_price", saleMax);

  const sort = f.sort || "new";
  if (sort === "sqft_desc" || sort === "sqft_asc") query = query.order("square_feet", { ascending: sort === "sqft_asc", nullsFirst: false });
  else if (sort === "rent_asc" || sort === "rent_desc") query = query.order("asking_rent", { ascending: sort === "rent_asc", nullsFirst: false });
  else if (sort === "sale_asc" || sort === "sale_desc") query = query.order("asking_sale_price", { ascending: sort === "sale_asc", nullsFirst: false });
  query = query.order("seq_no", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);

  const { data: rows, count, error } = await query;
  if (error) return <p className="error">Could not load properties: {error.message}</p>;
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const params = () => { const u = new URLSearchParams(); KEYS.forEach((k) => f[k] && u.set(k, f[k])); return u; };
  const link = (p: number) => { const u = params(); if (p > 1) u.set("page", String(p)); return `/properties${u.size ? `?${u}` : ""}`; };
  const advancedOn = ADVANCED.some((k) => f[k as (typeof KEYS)[number]] && !(k === "sort" && f.sort === "new"));
  const active = KEYS.filter((k) => f[k] && !(k === "sort" && f.sort === "new")).length;

  return (
    <>
      <form className="panel" action="/properties" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="filters" style={{ padding: 0, border: 0, background: "none" }}>
          <div className="field" style={{ flex: "3 1 280px" }}>
            <label htmlFor="q">Search</label>
            <input id="q" name="q" type="search" defaultValue={f.q} placeholder="Listing no, unit, development, building, tower or owner" />
          </div>
          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={f.status}>
              <option value="">Any</option>
              {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="intent">Rent / sale</label>
            <select id="intent" name="intent" defaultValue={f.intent}>
              <option value="">Any</option>
              <option value="rent">For rent</option>
              <option value="sale">For sale</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="location">Location</label>
            <select id="location" name="location" defaultValue={f.location}>
              <option value="">Any</option>
              {(locQ.data ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: "0 1 110px" }}>
            <label htmlFor="beds">Beds</label>
            <select id="beds" name="beds" defaultValue={f.beds}>
              <option value="">Any</option>
              {["0", "1", "2", "3"].map((b) => <option key={b} value={b}>{b === "0" ? "Studio" : b}</option>)}
              <option value="4">4+</option>
            </select>
          </div>
        </div>

        <details open={advancedOn || undefined}>
          <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600 }}>More filters{advancedOn ? " (in use)" : ""}</summary>
          <div className="filters" style={{ padding: 0, border: 0, background: "none", marginTop: 12 }}>
            <div className="field">
              <label htmlFor="development">Development</label>
              <select id="development" name="development" defaultValue={f.development}>
                <option value="">Any</option>
                {(devQ.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="tower">Tower</label><input id="tower" name="tower" defaultValue={f.tower} placeholder="e.g. Tower 2, Melford" /></div>
            <div className="field" style={{ flex: "0 1 130px" }}><label htmlFor="unit">Unit no</label><input id="unit" name="unit" defaultValue={f.unit} placeholder="e.g. 2304" /></div>
            <div className="field"><label htmlFor="owner">Owner</label><input id="owner" name="owner" defaultValue={f.owner} placeholder="Name, phone or email" /></div>
            <div className="field">
              <label htmlFor="agent">Our listing agent</label>
              <select id="agent" name="agent" defaultValue={f.agent}>
                <option value="">Anyone</option>
                <option value="none">No agent set</option>
                {(agentQ.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.full_name}{a.status !== "active" ? " (inactive)" : ""}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="via">Sourced via external agent</label>
              <select id="via" name="via" defaultValue={f.via}>
                <option value="">Any</option>
                {(extQ.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.agent_name}{a.company ? ` (${a.company})` : ""}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: "0 1 220px" }}>
              <span className="flabel-sm">Size (sq ft)</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input aria-label="Minimum sq ft" name="sqft_min" inputMode="numeric" defaultValue={f.sqft_min} placeholder="Min" />
                <span className="muted">to</span>
                <input aria-label="Maximum sq ft" name="sqft_max" inputMode="numeric" defaultValue={f.sqft_max} placeholder="Max" />
              </div>
            </div>
            <div className="field" style={{ flex: "0 1 150px" }}><label htmlFor="rent_max">Max rent</label><input id="rent_max" name="rent_max" inputMode="numeric" defaultValue={f.rent_max} placeholder="In listing currency" /></div>
            <div className="field" style={{ flex: "0 1 150px" }}><label htmlFor="sale_max">Max sale price</label><input id="sale_max" name="sale_max" inputMode="numeric" defaultValue={f.sale_max} placeholder="In listing currency" /></div>
            <div className="field">
              <label htmlFor="type">Type</label>
              <select id="type" name="type" defaultValue={f.type}>
                <option value="">Any</option>
                {TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: "0 1 140px" }}>
              <label htmlFor="published">On website</label>
              <select id="published" name="published" defaultValue={f.published}>
                <option value="">Any</option>
                <option value="yes">Published</option>
                <option value="no">Not published</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="sort">Sort</label>
              <select id="sort" name="sort" defaultValue={sort}>{SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </div>
          </div>
        </details>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn" type="submit">Search</button>
          {active > 0 && <Link className="btn btn-ghost" href="/properties">Clear {active} filter{active === 1 ? "" : "s"}</Link>}
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
              <th scope="col">Development · tower · unit</th>
              <th scope="col">Beds / baths · sq ft</th>
              <th scope="col">Price</th>
              <th scope="col">Owner · agent</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((p) => {
              const cover = p.photos?.find((ph) => ph.is_cover) ?? p.photos?.[0];
              const thumb = (cover?.variants as Record<string, { url: string }> | null)?.["400"]?.url;
              const tower = p.tower?.name ?? p.tower_name_legacy;
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
                    <div style={{ color: "var(--ink)", fontWeight: 500 }}>{p.development?.name ?? p.building_name ?? "—"}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{[tower, p.unit_number ? `Unit ${p.unit_number}` : null, p.location?.name].filter(Boolean).join(" · ")}</div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {p.beds ?? "–"} / {p.baths ?? "–"}
                    <div className="muted" style={{ fontSize: 12 }}>{p.square_feet ? `${Math.round(p.square_feet).toLocaleString()} sq ft` : ""}</div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{priceLines(p).map((l) => <div key={l}>{l}</div>)}</td>
                  <td>
                    <div>{p.owner?.name ?? <span className="muted">No owner linked</span>}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{p.listing_agent?.full_name ?? ""}</div>
                  </td>
                  <td>
                    <span className={`badge badge-${p.status}`}>{label(p.status)}</span>
                    {p.website_published && <span className="badge badge-live" style={{ marginLeft: 6 }}>Live</span>}
                  </td>
                </tr>
              );
            })}
            {!rows?.length && (
              <tr><td colSpan={7} className="muted" style={{ padding: 24 }}>No properties match these filters.</td></tr>
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
