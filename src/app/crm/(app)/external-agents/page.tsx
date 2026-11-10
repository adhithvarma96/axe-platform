import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function ExternalAgentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>External agents</h1>
          <p className="muted">Other brokers we co-broke with: who covers which buildings, and how reliable they are.</p>
        </div>
        <Link className="btn btn-sm" href="/external-agents/new">+ Add external agent</Link>
      </div>
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  await requireUser();
  const q = one((await searchParams).q).trim().replace(/[,()]/g, " ");
  const supabase = await createClient();
  let query = supabase.from("external_agents")
    .select("id, agent_name, company, phone, whatsapp, reliability, areas_covered_text, leads(count)")
    .is("deleted_at", null).order("agent_name").limit(500);
  if (q) query = query.or(`agent_name.ilike.%${q}%,company.ilike.%${q}%,phone.ilike.%${q}%,whatsapp.ilike.%${q}%,areas_covered_text.ilike.%${q}%`);
  const { data: rows, error } = await query;
  if (error) return <p className="error">Could not load external agents: {error.message}</p>;
  return (
    <>
      <form className="panel filters" action="/external-agents">
        <div className="field" style={{ flex: "2 1 260px" }}><label htmlFor="q">Search</label><input id="q" name="q" defaultValue={q} placeholder="Name, company, phone, building" /></div>
        <div style={{ display: "flex", gap: 8 }}><button className="btn" type="submit">Search</button><Link className="btn btn-ghost" href="/external-agents">Reset</Link></div>
      </form>
      <div className="pager"><strong style={{ color: "var(--ink)" }}>{rows?.length ?? 0} external agents</strong></div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">Agent</th><th scope="col">Company</th><th scope="col">Phone</th><th scope="col">Covers</th><th scope="col">Reliability</th><th scope="col">Leads referred</th></tr></thead>
          <tbody>
            {(rows ?? []).map((a) => (
              <tr key={a.id}>
                <td><Link href={`/external-agents/${a.id}`} style={{ fontWeight: 600 }}>{a.agent_name}</Link></td>
                <td>{a.company ?? "—"}</td>
                <td style={{ whiteSpace: "nowrap" }}>{a.phone ?? a.whatsapp ?? "—"}</td>
                <td style={{ maxWidth: 320 }}>{a.areas_covered_text ?? "—"}</td>
                <td>{a.reliability ? `${a.reliability} / 5` : "—"}</td>
                <td>{(a.leads as unknown as { count: number }[])?.[0]?.count ?? 0}</td>
              </tr>
            ))}
            {!rows?.length && <tr><td colSpan={6} className="muted" style={{ padding: 24 }}>No external agents match.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
