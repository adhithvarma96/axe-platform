import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { date, label } from "@/lib/format";
import { waNumber } from "@/lib/crm";
import { Notes, Promote, StatusPicker } from "../promote";

export default function MarketingLeadPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: m } = await supabase.from("marketing_leads")
    .select(`*, source:marketing_sources(name), lead:leads!marketing_leads_promoted_to_lead_id_fkey(lead_code, name), owner:owners(id, name),
      ext:external_agents(id, agent_name), partner:referral_partners(id, full_name)`)
    .eq("id", id).is("deleted_at", null).maybeSingle();
  if (!m) notFound();
  const wa = waNumber(m.whatsapp);
  const rows: [string, React.ReactNode][] = [
    ["Email", m.email], ["WhatsApp", m.whatsapp], ["Audience", label(m.audience_type)], ["Building / area", m.development_or_area],
    ["Source", m.source?.name], ["Opted in to marketing", m.marketing_opt_in ? "Yes" : "No"], ["Submitted", date((m.submitted_at ?? m.created_at).slice(0, 10))],
    ["Campaign", [m.utm_source, m.utm_medium, m.utm_campaign].filter(Boolean).join(" / ")],
  ];
  const promotedTo = m.lead ? <Link href={`/leads/${m.lead.lead_code}`}>Lead {m.lead.lead_code} · {m.lead.name}</Link>
    : m.owner ? <Link href={`/owners/${m.owner.id}`}>Owner · {m.owner.name}</Link>
    : m.ext ? <Link href={`/external-agents/${m.ext.id}`}>External agent · {m.ext.agent_name}</Link>
    : m.partner ? <Link href={`/referral-partners/${m.partner.id}`}>Referral partner · {m.partner.full_name}</Link> : null;

  return (
    <>
      <nav className="muted" style={{ fontSize: 13 }}><Link href="/marketing-leads">Marketing leads</Link> › {m.name || m.email}</nav>
      <div className="page-head">
        <div><h1>{m.name || m.email}</h1><p className="muted">{label(m.status)}{promotedTo ? <> · {promotedTo}</> : null}</p></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {wa && <a className="btn btn-sm" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">WhatsApp</a>}
          <a className="btn btn-ghost btn-sm" href={`mailto:${m.email}`}>Email</a>
        </div>
      </div>
      <div className="grid-2">
        <section className="panel">
          <h2 className="section-title">Details</h2>
          <dl className="facts">{rows.filter(([, v]) => v).map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </section>
        <section className="panel" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 className="section-title" style={{ margin: 0 }}>Promote</h2>
          <Promote id={m.id} status={m.status} />
          <StatusPicker id={m.id} status={m.status} />
          <Notes id={m.id} notes={m.notes} />
        </section>
      </div>
    </>
  );
}
