import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { label } from "@/lib/format";

type SP = Record<string, string | string[] | undefined>;

export default function DevelopmentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Developments</h1>
          <p className="muted">Buildings and projects. Each one can have its own page on the website.</p>
        </div>
        <Link className="btn" href="/developments/new">+ Add development</Link>
      </div>
      <Suspense fallback={<p className="muted">Loading developments…</p>}>
        <DevList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function DevList({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  await requireUser();
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q ?? "").trim();
  const supabase = await createClient();
  let query = supabase
    .from("developments")
    .select("id, name, developer_builder, development_status, slug, location:locations(name), towers:development_towers(count), properties(count)")
    .is("deleted_at", null)
    .order("name");
  if (q) query = query.ilike("name", `%${q}%`);
  const { data: rows, error } = await query;
  if (error) return <p className="error">Could not load developments: {error.message}</p>;
  const count = (v: unknown) => (v as { count: number }[] | null)?.[0]?.count ?? 0;

  return (
    <>
      <form className="panel filters" action="/developments">
        <div className="field" style={{ flex: "2 1 260px" }}>
          <label htmlFor="q">Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="Development name" />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" type="submit">Search</button>
          <Link className="btn btn-ghost" href="/developments">Reset</Link>
        </div>
      </form>
      <div className="pager"><strong style={{ color: "var(--ink)" }}>{rows?.length ?? 0} developments</strong></div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">Development</th><th scope="col">Location</th><th scope="col">Developer</th><th scope="col">Status</th><th scope="col">Towers</th><th scope="col">Properties</th><th scope="col">Website page</th></tr></thead>
          <tbody>
            {(rows ?? []).map((d) => (
              <tr key={d.id}>
                <td><Link href={`/developments/${d.id}`} style={{ fontWeight: 600 }}>{d.name}</Link></td>
                <td>{d.location?.name ?? "—"}</td>
                <td>{d.developer_builder ?? ""}</td>
                <td>{label(d.development_status)}</td>
                <td>{count(d.towers)}</td>
                <td>{count(d.properties)}</td>
                <td>{d.slug ? <span className="badge badge-available">Set up</span> : <span className="muted" style={{ fontSize: 13 }}>Not yet</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
