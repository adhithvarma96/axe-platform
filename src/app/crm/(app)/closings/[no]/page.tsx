import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { date, label, money } from "@/lib/format";
import { ClosingForm } from "../closing-form";
import { sidePct } from "@/lib/commission";
import { closingOptions } from "../form-data";
import { PayoutButton } from "../../commissions/payout-button";

type SP = Record<string, string | string[] | undefined>;

export default function ClosingPage({ params, searchParams }: { params: Promise<{ no: string }>; searchParams: Promise<SP> }) {
  return <Suspense fallback={<p className="muted">Loading…</p>}><Closing params={params} searchParams={searchParams} /></Suspense>;
}

async function Closing({ params, searchParams }: { params: Promise<{ no: string }>; searchParams: Promise<SP> }) {
  await connection();
  const user = await requireUser();
  if (user.role !== "super_admin" && user.role !== "sales_manager") return <p className="muted">Closings are visible to the Super Admin only.</p>;
  const { no } = await params;
  const editing = (await searchParams).edit === "1" && user.role === "super_admin";
  const supabase = await createClient();
  const { data: c } = await supabase.from("closings")
    .select(`*, lead:leads(lead_code, name), property:properties(listing_no, development:developments(name), location:locations(name)),
      lead_agent:agents!closings_lead_side_agent_id_fkey(full_name), listing_agent:agents!closings_listing_side_agent_id_fkey(full_name),
      ext:external_agents(agent_name), lead_ref:referral_partners!closings_lead_side_referral_partner_id_fkey(full_name),
      list_ref:referral_partners!closings_listing_side_referral_partner_id_fkey(full_name), schedule:commission_schedules(version, name)`)
    .eq("closing_no", Number(no) || -1).is("deleted_at", null).maybeSingle();
  if (!c) notFound();

  if (editing) {
    const options = await closingOptions();
    const p = options.properties.find((x) => x.no === c.property?.listing_no);
    return (
      <>
        <div className="page-head"><div><h1>Edit closing #{c.closing_no}</h1><p className="muted">Paid payout lines are never changed; unpaid ones are rebuilt from the new split.</p></div></div>
        <ClosingForm options={options} values={{
          ...(c as unknown as Record<string, string | number | null>),
          lead: c.lead ? `${c.lead.lead_code} – ${c.lead.name}` : "", property: p ? `${p.no} – ${p.label}` : c.property?.listing_no ?? "",
        }} />
      </>
    );
  }

  const { data: payouts } = await supabase.from("commission_payouts")
    .select("id, payee_type, side, amount, currency, due_date, paid_on, agent:agents(full_name), partner:referral_partners(full_name)")
    .eq("closing_id", c.id).is("deleted_at", null).order("side");
  const fmt = (x: number | null) => (x == null ? "—" : money(x, c.commission_currency));
  const balanced = Math.abs(Number(c.split_delta ?? 0)) <= 1;
  const pct = (pts: number | null) => (pts == null ? "—" : `${sidePct(Number(pts))}%`);
  const sale = c.deal_type === "sale";
  const split = c.lead_side_commission != null || c.listing_side_commission != null;
  const leadBase = split ? Number(c.lead_side_commission ?? 0) : Number(c.our_commission ?? 0) / 2;
  const listBase = split ? Number(c.listing_side_commission ?? 0) : Number(c.our_commission ?? 0) - leadBase;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}><Link href="/closings">Closings</Link> / #{c.closing_no}</p>
          <h1>{label(c.deal_type)} · {c.property?.listing_no ?? "no property"}</h1>
          <p className="muted" style={{ margin: 0 }}>{date(c.closing_date)} · {[c.property?.development?.name, c.property?.location?.name].filter(Boolean).join(" · ")} · Schedule {c.schedule?.version}</p>
        </div>
        {user.role === "super_admin" && <Link className="btn btn-ghost btn-sm" href={`/closings/${c.closing_no}?edit=1`}>Edit</Link>}
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2 className="section-title">Deal</h2>
          <dl className="facts">
            <dt>Lead</dt><dd>{c.lead ? <Link href={`/leads/${c.lead.lead_code}`}>{c.lead.name} ({c.lead.lead_code})</Link> : "—"}</dd>
            <dt>Property</dt><dd>{c.property ? <Link href={`/properties/${c.property.listing_no}`}>{c.property.listing_no}</Link> : "—"}</dd>
            {c.monthly_rent != null && <><dt>Monthly rent</dt><dd>{money(c.monthly_rent, c.deal_currency)}{c.monthly_rent_usd ? <span className="muted"> · US${Math.round(c.monthly_rent_usd).toLocaleString()}</span> : null}</dd></>}
            <dt>Deal value</dt><dd>{money(c.total_deal_value, c.deal_currency)}</dd>
            {c.lease_start_date && <><dt>Lease</dt><dd>{date(c.lease_start_date)} – {date(c.lease_end_date)}</dd></>}
            <dt>FX rate</dt><dd>{c.usd_lkr_rate ?? "—"}</dd>
            {c.rent_per_sqft_usd != null && <><dt>Rent / sq ft</dt><dd>US${Number(c.rent_per_sqft_usd).toFixed(2)} <span className="muted">(internal)</span></dd></>}
            {c.ext && <><dt>Co-broke</dt><dd>{c.ext.agent_name} · {c.co_broke_split_pct ?? "?"}%</dd></>}
          </dl>
          {c.notes && <p style={{ whiteSpace: "pre-line", marginBottom: 0 }}>{c.notes}</p>}
        </section>
        <section className="panel">
          <h2 className="section-title">Commission split · {fmt(c.our_commission)}</h2>
          <div className="table-wrap">
            <table className="split">
              <thead><tr><th scope="col">Side</th><th scope="col">Commission</th><th scope="col">Agent</th><th scope="col">Referrer</th><th scope="col">Axe</th></tr></thead>
              <tbody>
                <tr>
                  <td>{sale ? "Buyer" : "Tenant"}<div className="muted" style={{ fontSize: 12 }}>{c.lead_agent?.full_name ?? "No agent"} · {label(c.lead_sourcing_model) || "?"} · {c.lead_agent_exempt ? "exempt" : c.lead_agent_tenure}</div></td>
                  <td>{fmt(leadBase)}{!split && <div className="muted" style={{ fontSize: 12 }}>half (not split)</div>}</td>
                  <td>{fmt(c.lead_agent_payout)}<div className="muted" style={{ fontSize: 12 }}>{pct(c.lead_agent_rate)}</div></td>
                  <td>{fmt(c.lead_referrer_payout)}<div className="muted" style={{ fontSize: 12 }}>{Number(c.lead_referrer_rate) ? `${pct(c.lead_referrer_rate)} · ` : ""}{c.lead_ref?.full_name ?? ""}</div></td>
                  <td>{fmt(c.lead_axe_payout)}<div className="muted" style={{ fontSize: 12 }}>{pct(c.lead_axe_rate)}</div></td>
                </tr>
                <tr>
                  <td>{sale ? "Seller" : "Landlord"}<div className="muted" style={{ fontSize: 12 }}>{c.listing_agent?.full_name ?? "No agent"} · {label(c.listing_sourcing_model) || "?"} · {c.listing_agent_exempt ? "exempt" : c.listing_agent_tenure}</div></td>
                  <td>{fmt(listBase)}{!split && <div className="muted" style={{ fontSize: 12 }}>half (not split)</div>}</td>
                  <td>{fmt(c.listing_agent_payout)}<div className="muted" style={{ fontSize: 12 }}>{pct(c.listing_agent_rate)}</div></td>
                  <td>{fmt(c.listing_referrer_payout)}<div className="muted" style={{ fontSize: 12 }}>{Number(c.listing_referrer_rate) ? `${pct(c.listing_referrer_rate)} · ` : ""}{c.list_ref?.full_name ?? ""}</div></td>
                  <td>{fmt(c.listing_axe_payout)}<div className="muted" style={{ fontSize: 12 }}>{pct(c.listing_axe_rate)}</div></td>
                </tr>
              </tbody>
              <tfoot><tr><td>Total</td><td>{fmt(c.our_commission)}</td><td>{fmt(c.agent_total)}</td><td>{fmt(c.referrer_total)}</td><td>{fmt(c.axe_total)}</td></tr></tfoot>
            </table>
          </div>
          <p className={balanced ? "balanced" : "unbalanced"} style={{ margin: "10px 0 0" }}>{balanced ? "✓ Balanced" : `✗ Off by ${fmt(c.split_delta)}`}{c.split_override_reason ? <span className="muted" style={{ fontWeight: 400 }}> · Override: {c.split_override_reason}</span> : null}</p>
        </section>
      </div>

      <section className="panel">
        <h2 className="section-title">Payouts</h2>
        {payouts?.length ? (
          <ul className="mini-list">
            {payouts.map((p) => (
              <li key={p.id}>
                <span>{p.agent?.full_name ?? p.partner?.full_name} <span className="muted">· {p.side} side · {p.payee_type === "agent" ? `cycle ${date(p.due_date)}` : "after Axe is paid"}</span></span>
                <span style={{ display: "flex", gap: 10, alignItems: "center" }}><b>{money(p.amount, p.currency)}</b>{user.role === "super_admin" && <PayoutButton id={p.id} paidOn={p.paid_on} />}</span>
              </li>
            ))}
          </ul>
        ) : <p className="muted">{c.airtable_id ? "Imported from Airtable: payouts were tracked there." : "No payouts on this deal (owner-exempt sides or no agent)."}</p>}
      </section>
    </>
  );
}
