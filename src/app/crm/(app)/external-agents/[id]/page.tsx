import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { date } from "@/lib/format";
import { stageLabel, waNumber } from "@/lib/crm";
import { PartyForm } from "../../party-form";
import { saveExternalAgent } from "../actions";
import { EXTERNAL_AGENT_FIELDS } from "../fields";

export default function ExternalAgentPage({ params }: { params: Promise<{ id: string }> }) {
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
  const { data: a } = await supabase.from("external_agents")
    .select("*, locations:external_agent_locations(location:locations(name)), leads(lead_code, name, pipeline_status, created_at)")
    .eq("id", id).is("deleted_at", null).maybeSingle();
  if (!a) notFound();
  const isAdmin = user.role === "super_admin" || user.role === "sales_manager";
  const [propsQ, closingsQ] = await Promise.all([
    supabase.from("property_source_external_agents").select("property:properties(listing_no, status, development:developments(name))").eq("external_agent_id", id),
    isAdmin ? supabase.from("closings").select("closing_no, closing_date, deal_type").eq("co_broke_external_agent_id", id).is("deleted_at", null).order("closing_date", { ascending: false }) : Promise.resolve({ data: null }),
  ]);
  const wa = waNumber(a.whatsapp ?? a.phone);

  return (
    <>
      <nav className="muted" style={{ fontSize: 13 }}><Link href="/external-agents">External agents</Link> › {a.agent_name}</nav>
      <div className="page-head">
        <div><h1>{a.agent_name}</h1><p className="muted">{[a.company, a.reliability ? `reliability ${a.reliability}/5` : null].filter(Boolean).join(" · ")}</p></div>
        {wa && <a className="btn btn-sm" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">WhatsApp</a>}
      </div>
      <div className="grid-2">
        <section className="panel">
          <h2 className="section-title">Details</h2>
          <PartyForm fields={EXTERNAL_AGENT_FIELDS} values={{ id: a.id, agent_name: a.agent_name, company: a.company, phone: a.phone, whatsapp: a.whatsapp, email: a.email, areas_covered_text: a.areas_covered_text, notes: a.notes, reliability: a.reliability ?? "" }} action={saveExternalAgent} submit="Save" />
          {!!a.locations?.length && <p className="muted" style={{ fontSize: 13 }}>Areas linked in Airtable: {a.locations.map((l) => l.location?.name).filter(Boolean).join(", ")}</p>}
        </section>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className="panel">
            <h2 className="section-title">Leads they referred ({a.leads?.length ?? 0})</h2>
            <ul className="mini-list">
              {(a.leads ?? []).map((l) => <li key={l.lead_code}><Link href={`/leads/${l.lead_code}`}>{l.name}</Link><span className="muted">{stageLabel(l.pipeline_status)} · {date(l.created_at.slice(0, 10))}</span></li>)}
              {!a.leads?.length && <li className="muted">None yet.</li>}
            </ul>
          </section>
          <section className="panel">
            <h2 className="section-title">Properties sourced through them ({propsQ.data?.length ?? 0})</h2>
            <ul className="mini-list">
              {(propsQ.data ?? []).map((p) => p.property && <li key={p.property.listing_no}><Link href={`/properties/${p.property.listing_no}`}>{p.property.listing_no}</Link><span className="muted">{p.property.development?.name ?? ""} · {p.property.status}</span></li>)}
              {!propsQ.data?.length && <li className="muted">None yet.</li>}
            </ul>
          </section>
          {closingsQ.data && (
            <section className="panel">
              <h2 className="section-title">Co-broke closings ({closingsQ.data.length})</h2>
              <ul className="mini-list">
                {closingsQ.data.map((c) => <li key={c.closing_no}><Link href={`/closings/${c.closing_no}`}>Closing {c.closing_no}</Link><span className="muted">{c.deal_type} · {date(c.closing_date)}</span></li>)}
                {!closingsQ.data.length && <li className="muted">None yet.</li>}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
