import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { date, label } from "@/lib/format";
import { addDays, today } from "@/lib/crm";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function ReferralPartnersPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Referral partners</h1>
          <p className="muted">People who refer clients or owners. First to register wins; agreements are tracked here and you are alerted 30 days before one expires.</p>
        </div>
        <Link className="btn btn-sm" href="/referral-partners/new">+ Add referral partner</Link>
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
  let query = supabase.from("referral_partners")
    .select("id, full_name, company_organization, phone, attribution, agreement_valid_until, referral_rate_pct, category:referrer_categories(name), agent:agents(full_name), leads(count)")
    .is("deleted_at", null).order("full_name").limit(500);
  if (q) query = query.or(`full_name.ilike.%${q}%,company_organization.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
  const { data: rows, error } = await query;
  if (error) return <p className="error">Could not load referral partners: {error.message}</p>;
  const on = today();
  const agreement = (d: string | null) => {
    if (!d) return <span className="muted">No agreement</span>;
    if (d < on) return <span className="badge badge-withdrawn">Expired {date(d)}</span>;
    if (d <= addDays(on, 30)) return <span className="badge badge-reserved">Expires {date(d)}</span>;
    return <span>Valid to {date(d)}</span>;
  };
  return (
    <>
      <form className="panel filters" action="/referral-partners">
        <div className="field" style={{ flex: "2 1 260px" }}><label htmlFor="q">Search</label><input id="q" name="q" defaultValue={q} placeholder="Name, company, phone, email" /></div>
        <div style={{ display: "flex", gap: 8 }}><button className="btn" type="submit">Search</button><Link className="btn btn-ghost" href="/referral-partners">Reset</Link></div>
      </form>
      <div className="pager"><strong style={{ color: "var(--ink)" }}>{rows?.length ?? 0} referral partners</strong></div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">Partner</th><th scope="col">Category</th><th scope="col">Whose</th><th scope="col">Rate</th><th scope="col">Agreement</th><th scope="col">Leads</th></tr></thead>
          <tbody>
            {(rows ?? []).map((p) => (
              <tr key={p.id}>
                <td><Link href={`/referral-partners/${p.id}`} style={{ fontWeight: 600 }}>{p.full_name}</Link>{p.company_organization && <div className="muted" style={{ fontSize: 12 }}>{p.company_organization}</div>}</td>
                <td>{p.category?.name ?? "—"}</td>
                <td>{p.attribution === "agent_personal_referrer" ? `${p.agent?.full_name ?? "Agent"}'s` : label(p.attribution) || "—"}</td>
                <td>{p.referral_rate_pct}%</td>
                <td>{agreement(p.agreement_valid_until)}</td>
                <td>{(p.leads as unknown as { count: number }[])?.[0]?.count ?? 0}</td>
              </tr>
            ))}
            {!rows?.length && <tr><td colSpan={6} className="muted" style={{ padding: 24 }}>No referral partners match.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
