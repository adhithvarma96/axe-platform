import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { date, money } from "@/lib/format";
import { PayoutButton } from "./payout-button";

type SP = Record<string, string | string[] | undefined>;

export default function CommissionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <>
      <div className="page-head"><div><h1>Commissions</h1><p className="muted">What&apos;s owed and paid. Agents are paid on the 10th, 20th and last day; referrers once Axe has been paid.</p></div></div>
      <Suspense fallback={<p className="muted">Loading…</p>}><Commissions searchParams={searchParams} /></Suspense>
    </>
  );
}

type Payout = {
  id: string; payee_type: string; side: string; amount: number; currency: string; due_date: string | null; paid_on: string | null;
  agent: { full_name: string } | null; partner: { full_name: string } | null; closing: { closing_no: number; closing_date: string } | null;
};

async function Commissions({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const user = await requireUser();
  if (user.role !== "super_admin" && user.role !== "sales_manager") return <p className="muted">Commissions are visible to the Super Admin only.</p>;
  const show = (await searchParams).show === "paid" ? "paid" : "owed";
  const supabase = await createClient();
  let q = supabase.from("commission_payouts")
    .select("id, payee_type, side, amount, currency, due_date, paid_on, agent:agents(full_name), partner:referral_partners(full_name), closing:closings(closing_no, closing_date)")
    .is("deleted_at", null);
  q = show === "paid" ? q.not("paid_on", "is", null).order("paid_on", { ascending: false }).limit(300) : q.is("paid_on", null).order("due_date", { nullsFirst: false });
  const { data, error } = await q;
  if (error) return <p className="error">{error.message}</p>;
  const rows = (data ?? []) as unknown as Payout[];

  // group: agent payouts by cycle date, referrer payouts in one "after receipt" group
  const groups = new Map<string, Payout[]>();
  for (const p of rows) {
    const k = p.payee_type === "agent" ? (show === "paid" ? `Paid ${date(p.paid_on)}` : `Cycle ${date(p.due_date)}`) : "Referral fees (after Axe is paid)";
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  const totals = (ps: Payout[]) => {
    const t = new Map<string, number>();
    ps.forEach((p) => t.set(p.currency, (t.get(p.currency) ?? 0) + Number(p.amount)));
    return [...t.entries()].map(([c, a]) => money(a, c)).join(" + ");
  };

  return (
    <>
      <div className="seg-tabs" style={{ alignSelf: "flex-start" }}>
        <Link className={show === "owed" ? "on" : ""} href="/commissions">Owed</Link>
        <Link className={show === "paid" ? "on" : ""} href="/commissions?show=paid">Paid</Link>
      </div>
      {!rows.length && <p className="muted">{show === "owed" ? "Nothing owed. New payouts appear here when a closing is logged." : "No payouts marked paid yet."}</p>}
      {[...groups.entries()].map(([k, ps]) => (
        <section key={k} className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <h2 className="section-title" style={{ margin: 0 }}>{k}</h2>
            <b>{totals(ps)}</b>
          </div>
          <ul className="mini-list" style={{ marginTop: 8 }}>
            {ps.map((p) => (
              <li key={p.id}>
                <span>{p.agent?.full_name ?? p.partner?.full_name} <span className="muted">· {p.side} side · <Link href={`/closings/${p.closing?.closing_no}`}>closing #{p.closing?.closing_no}</Link></span></span>
                <span style={{ display: "flex", gap: 10, alignItems: "center" }}><b>{money(p.amount, p.currency)}</b>{user.role === "super_admin" && <PayoutButton id={p.id} paidOn={p.paid_on} />}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
