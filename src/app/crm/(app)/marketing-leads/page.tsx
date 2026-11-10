import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { date, label } from "@/lib/format";

const PAGE = 50;
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const STATUSES = ["new", "nurturing", "engaged", "promoted", "unsubscribed", "disqualified"];
const AUDIENCES = [["owner", "Owner"], ["buyer_investor", "Buyer / investor"], ["tenant", "Tenant"]];

export default function MarketingLeadsPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Marketing leads</h1>
          <p className="muted">Report downloads, newsletter sign-ups and campaign forms. Nurtured by email; promote one after a real conversation.</p>
        </div>
      </div>
      <Suspense fallback={<p className="muted">Loading marketing leads…</p>}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  await requireUser();
  const sp = await searchParams;
  const q = one(sp.q).trim().replace(/[,()]/g, " ");
  const status = STATUSES.includes(one(sp.status)) ? one(sp.status) : "";
  const audience = AUDIENCES.some(([k]) => k === one(sp.audience)) ? one(sp.audience) : "";
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const supabase = await createClient();

  let query = supabase.from("marketing_leads")
    .select("id, name, email, whatsapp, audience_type, development_or_area, status, submitted_at, created_at, source:marketing_sources(name)", { count: "exact" })
    .is("deleted_at", null).order("submitted_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,whatsapp.ilike.%${q}%,development_or_area.ilike.%${q}%`);
  if (status) query = query.eq("status", status as never);
  else query = query.not("status", "in", "(promoted,disqualified,unsubscribed)");
  if (audience) query = query.eq("audience_type", audience as never);
  const { data: rows, count, error } = await query;
  if (error) return <p className="error">Could not load marketing leads: {error.message}</p>;
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (p: number) => `/marketing-leads?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), ...(audience ? { audience } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <>
      <form className="panel filters" action="/marketing-leads">
        <div className="field" style={{ flex: "2 1 240px" }}><label htmlFor="q">Search</label><input id="q" name="q" defaultValue={q} placeholder="Name, email, WhatsApp, building" /></div>
        <div className="field"><label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status}><option value="">Open (not promoted or closed)</option>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
        </div>
        <div className="field"><label htmlFor="audience">Audience</label>
          <select id="audience" name="audience" defaultValue={audience}><option value="">All</option>{AUDIENCES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </div>
        <div style={{ display: "flex", gap: 8 }}><button className="btn" type="submit">Filter</button><Link className="btn btn-ghost" href="/marketing-leads">Reset</Link></div>
      </form>
      <div className="pager"><strong style={{ color: "var(--ink)" }}>{total.toLocaleString()} marketing leads</strong><span className="muted">Page {page} of {pages}</span></div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">Name</th><th scope="col">Audience</th><th scope="col">Building / area</th><th scope="col">Source</th><th scope="col">Status</th><th scope="col">Submitted</th></tr></thead>
          <tbody>
            {(rows ?? []).map((m) => (
              <tr key={m.id}>
                <td><Link href={`/marketing-leads/${m.id}`} style={{ fontWeight: 600 }}>{m.name || m.email}</Link>{m.name && <div className="muted" style={{ fontSize: 12 }}>{m.email}</div>}</td>
                <td>{AUDIENCES.find(([k]) => k === m.audience_type)?.[1] ?? "—"}</td>
                <td>{m.development_or_area ?? "—"}</td>
                <td>{m.source?.name ?? "—"}</td>
                <td><span className={`badge${m.status === "promoted" ? " badge-live" : m.status === "disqualified" || m.status === "unsubscribed" ? " badge-withdrawn" : ""}`}>{label(m.status)}</span></td>
                <td style={{ whiteSpace: "nowrap" }}>{date((m.submitted_at ?? m.created_at).slice(0, 10))}</td>
              </tr>
            ))}
            {!rows?.length && <tr><td colSpan={6} className="muted" style={{ padding: 24 }}>No marketing leads match.</td></tr>}
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
