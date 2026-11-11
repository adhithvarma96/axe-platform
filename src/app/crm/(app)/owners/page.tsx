import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { label } from "@/lib/format";
import { MANDATES } from "./mandates";

const PAGE = 50;
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function OwnersPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Owners</h1>
          <p className="muted">Landlords and sellers, with how each prefers to be contacted.</p>
        </div>
        <Link className="btn" href="/owners/new">+ Add owner</Link>
      </div>
      <Suspense fallback={<p className="muted">Loading owners…</p>}>
        <OwnerList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function OwnerList({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  await requireUser();
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const buyers = one(sp.buyers) === "1";
  const mandate = MANDATES.some(([k]) => k === one(sp.mandate)) ? one(sp.mandate) : "";
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("owners")
    .select("id, name, owner_type, primary_phone, contact_protocol, open_to_buying, mandate_status, properties(count)", { count: "exact" })
    .is("deleted_at", null)
    .order("name")
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (q) query = query.or(`name.ilike.%${q.replace(/[,()]/g, " ")}%,primary_phone.ilike.%${q.replace(/[,()]/g, " ")}%,email.ilike.%${q.replace(/[,()]/g, " ")}%`);
  if (buyers) query = query.eq("open_to_buying", true);
  if (mandate) query = query.eq("mandate_status", mandate as never);
  const { data: rows, count, error } = await query;
  if (error) return <p className="error">Could not load owners: {error.message}</p>;
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (p: number) => `/owners?${new URLSearchParams({ ...(q ? { q } : {}), ...(buyers ? { buyers: "1" } : {}), ...(mandate ? { mandate } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <>
      <form className="panel filters" action="/owners">
        <div className="field" style={{ flex: "2 1 260px" }}>
          <label htmlFor="q">Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="Name, phone or email" />
        </div>
        <div className="field">
          <label htmlFor="mandate">Mandate</label>
          <select id="mandate" name="mandate" defaultValue={mandate}><option value="">All</option>{MANDATES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, minHeight: 44 }}>
          <input type="checkbox" name="buyers" value="1" defaultChecked={buyers} style={{ width: 18, height: 18, accentColor: "var(--red)" }} /> Open to buying only
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" type="submit">Filter</button>
          <Link className="btn btn-ghost" href="/owners">Reset</Link>
        </div>
      </form>
      <div className="pager"><strong style={{ color: "var(--ink)" }}>{total.toLocaleString()} owners</strong><span className="muted">Page {page} of {pages}</span></div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">Owner</th><th scope="col">Type</th><th scope="col">Phone</th><th scope="col">Mandate</th><th scope="col">Contact protocol</th><th scope="col">Properties</th></tr></thead>
          <tbody>
            {(rows ?? []).map((o) => (
              <tr key={o.id}>
                <td><Link href={`/owners/${o.id}`} style={{ fontWeight: 600 }}>{o.name}</Link>{o.open_to_buying && <span className="badge" style={{ marginLeft: 8 }}>Buyer</span>}</td>
                <td>{label(o.owner_type)}</td>
                <td style={{ whiteSpace: "nowrap" }}>{o.primary_phone}</td>
                <td>{MANDATES.find(([k]) => k === o.mandate_status)?.[1] ?? "—"}</td>
                <td>{label(o.contact_protocol)}</td>
                <td>{(o.properties as unknown as { count: number }[])?.[0]?.count ?? 0}</td>
              </tr>
            ))}
            {!rows?.length && <tr><td colSpan={6} className="muted" style={{ padding: 24 }}>No owners match.</td></tr>}
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
