import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { date, label, money } from "@/lib/format";

type SP = Record<string, string | string[] | undefined>;

export default function ClosingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <>
      <div className="page-head">
        <div><h1>Closings</h1><p className="muted">Completed deals and how each commission was split. Super Admin only.</p></div>
        <Link className="btn" href="/closings/new">+ Log closing</Link>
      </div>
      <Suspense fallback={<p className="muted">Loading closings…</p>}><Closings searchParams={searchParams} /></Suspense>
    </>
  );
}

async function Closings({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const user = await requireUser();
  if (user.role !== "super_admin" && user.role !== "sales_manager") return <p className="muted">Closings are visible to the Super Admin only.</p>;
  const year = String((await searchParams).fy ?? "");
  const supabase = await createClient();
  let q = supabase.from("closings")
    .select("id, closing_no, closing_date, deal_type, our_commission, commission_currency, usd_lkr_rate, referrer_total, split_delta, split_override_reason, total_deal_value, deal_currency, lead:leads(lead_code, name), property:properties(listing_no, development:developments(name)), lead_agent:agents!closings_lead_side_agent_id_fkey(full_name), listing_agent:agents!closings_listing_side_agent_id_fkey(full_name)")
    .is("deleted_at", null).order("closing_date", { ascending: false }).order("closing_no", { ascending: false });
  if (/^\d{4}$/.test(year)) q = q.gte("closing_date", `${year}-04-01`).lte("closing_date", `${Number(year) + 1}-03-31`);
  const { data: rows, error } = await q;
  if (error) return <p className="error">{error.message}</p>;
  const toLkr = (amt: number | null, cur: string | null, rate: number | null) => (amt == null ? 0 : cur === "USD" ? amt * (rate || 0) : amt);
  const revenue = (rows ?? []).reduce((a, c) => a + toLkr(c.our_commission, c.commission_currency, c.usd_lkr_rate) - toLkr(c.referrer_total, c.commission_currency, c.usd_lkr_rate), 0);

  return (
    <>
      <div className="pager">
        <span><strong style={{ color: "var(--ink)" }}>{rows?.length ?? 0} closings</strong> <span className="muted">· revenue counted toward target (commission less referral fees): {money(revenue, "LKR")}</span></span>
        <form action="/closings" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <label htmlFor="fy" className="muted" style={{ fontSize: 13 }}>Financial year from April</label>
          <select id="fy" name="fy" defaultValue={year} style={{ font: "inherit", minHeight: 36, borderRadius: 8, border: "1px solid var(--line)" }}>
            <option value="">All</option>{[2026, 2025, 2024].map((y) => <option key={y} value={y}>{y}/{String(y + 1).slice(2)}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" type="submit">Show</button>
        </form>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">#</th><th scope="col">Date</th><th scope="col">Deal</th><th scope="col">Sides</th><th scope="col">Our commission</th><th scope="col">Split</th></tr></thead>
          <tbody>
            {(rows ?? []).map((c) => (
              <tr key={c.id}>
                <td><Link href={`/closings/${c.closing_no}`} style={{ fontWeight: 700 }}>#{c.closing_no}</Link></td>
                <td style={{ whiteSpace: "nowrap" }}>{date(c.closing_date)}</td>
                <td>{label(c.deal_type)} · {c.property?.listing_no ?? "—"}<div className="muted" style={{ fontSize: 12 }}>{[c.property?.development?.name, c.lead?.name].filter(Boolean).join(" · ")}</div></td>
                <td style={{ fontSize: 13 }}>Lead: {c.lead_agent?.full_name ?? "—"}<br />Listing: {c.listing_agent?.full_name ?? "—"}</td>
                <td style={{ whiteSpace: "nowrap" }}>{money(c.our_commission, c.commission_currency)}</td>
                <td>{Math.abs(Number(c.split_delta ?? 0)) <= 1 ? <span className="balanced">✓</span> : <span className={c.split_override_reason ? "muted" : "unbalanced"} title={c.split_override_reason ?? ""}>{c.split_override_reason ? "Override" : "✗"}</span>}</td>
              </tr>
            ))}
            {!rows?.length && <tr><td colSpan={6} className="muted" style={{ padding: 24 }}>No closings yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
