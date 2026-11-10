import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { date, money } from "@/lib/format";
import { stageLabel, waNumber } from "@/lib/crm";
import { PartyForm } from "../../party-form";
import { saveReferralPartner } from "../actions";
import { referralPartnerFields } from "../fields";

export default function ReferralPartnerPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const isSuper = user.role === "super_admin";
  const isAdmin = isSuper || user.role === "sales_manager";
  const [pQ, leadsQ, nicQ, closingsQ, fields] = await Promise.all([
    supabase.from("referral_partners").select("*").eq("id", id).is("deleted_at", null).maybeSingle(),
    supabase.from("leads").select("lead_code, name, pipeline_status, created_at").eq("referral_partner_id", id).is("deleted_at", null).order("created_at", { ascending: false }),
    isSuper ? supabase.from("referral_partner_private").select("nic_number").eq("referral_partner_id", id).maybeSingle() : Promise.resolve({ data: null }),
    isAdmin ? supabase.from("closings").select("closing_no, closing_date, commission_currency, lead_side_referral_partner_id, listing_side_referral_partner_id, lead_referrer_payout, listing_referrer_payout")
      .or(`lead_side_referral_partner_id.eq.${id},listing_side_referral_partner_id.eq.${id}`).is("deleted_at", null).order("closing_date", { ascending: false }) : Promise.resolve({ data: null }),
    referralPartnerFields(isSuper),
  ]);
  const p = pQ.data;
  if (!p) notFound();
  const wa = waNumber(p.phone);
  const owed = (c: NonNullable<typeof closingsQ.data>[number]) =>
    (c.lead_side_referral_partner_id === id ? Number(c.lead_referrer_payout ?? 0) : 0) + (c.listing_side_referral_partner_id === id ? Number(c.listing_referrer_payout ?? 0) : 0);

  return (
    <>
      <nav className="muted" style={{ fontSize: 13 }}><Link href="/referral-partners">Referral partners</Link> › {p.full_name}</nav>
      <div className="page-head">
        <div><h1>{p.full_name}</h1><p className="muted">Registered {p.registered_at ? date(p.registered_at.slice(0, 10)) : "—"} · {p.referral_rate_pct}% of Axe&apos;s share</p></div>
        {wa && <a className="btn btn-sm" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">WhatsApp</a>}
      </div>
      <div className="grid-2">
        <section className="panel">
          <h2 className="section-title">Details and agreement</h2>
          <PartyForm fields={fields} values={{ ...p, nic_number: nicQ.data?.nic_number ?? "" }} action={saveReferralPartner} submit="Save" />
        </section>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className="panel">
            <h2 className="section-title">Leads they referred ({leadsQ.data?.length ?? 0})</h2>
            <ul className="mini-list">
              {(leadsQ.data ?? []).map((l) => <li key={l.lead_code}><Link href={`/leads/${l.lead_code}`}>{l.name}</Link><span className="muted">{stageLabel(l.pipeline_status)} · {date(l.created_at.slice(0, 10))}</span></li>)}
              {!leadsQ.data?.length && <li className="muted">None yet.</li>}
            </ul>
          </section>
          {closingsQ.data && (
            <section className="panel">
              <h2 className="section-title">Referral fees ({closingsQ.data.length} closings)</h2>
              <ul className="mini-list">
                {closingsQ.data.map((c) => <li key={c.closing_no}><Link href={`/closings/${c.closing_no}`}>Closing {c.closing_no}</Link><span className="muted">{money(owed(c), c.commission_currency)} · {date(c.closing_date)}</span></li>)}
                {!closingsQ.data.length && <li className="muted">None yet.</li>}
              </ul>
              <p className="muted" style={{ fontSize: 13, margin: "8px 0 0" }}>Payment status is on <Link href="/commissions">Commissions</Link>.</p>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
