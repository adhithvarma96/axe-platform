import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DELETABLE, type Deletable } from "./rules";
import { RestoreButton } from "./delete-button";

export default function BinPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Deleted bin</h1>
          <p className="muted">Records the Super Admin deleted. Nothing here is gone for good; restore puts it straight back.</p>
        </div>
      </div>
      <Suspense fallback={<p className="muted">Loading…</p>}><Bin /></Suspense>
    </>
  );
}

async function Bin() {
  await connection();
  const user = await requireUser();
  if (user.role !== "super_admin") redirect("/dashboard");
  const supabase = await createClient();
  const tables = Object.keys(DELETABLE) as Deletable[];
  const results = await Promise.all(tables.map(async (t) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from(t) as any).select(`id, deleted_at, name:${DELETABLE[t].nameCol}`).not("deleted_at", "is", null).order("deleted_at", { ascending: false }).limit(200);
    return { t, rows: (data ?? []) as { id: string; name: string; deleted_at: string }[] };
  }));
  const any = results.some((r) => r.rows.length);
  if (!any) return <p className="muted panel" style={{ margin: 0 }}>The bin is empty.</p>;
  return (
    <>
      {results.filter((r) => r.rows.length).map(({ t, rows }) => (
        <section key={t} className="panel">
          <h2 className="section-title">{DELETABLE[t].label}s ({rows.length})</h2>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th scope="col">Name</th><th scope="col">Deleted</th><th scope="col"><span className="sr-only">Restore</span></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: "var(--ink)" }}>{r.name}</td>
                    <td className="muted">{new Date(r.deleted_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" })}</td>
                    <td style={{ textAlign: "right" }}><RestoreButton table={t} id={r.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
