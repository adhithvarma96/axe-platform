import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { date, label } from "@/lib/format";
import { needsFollowUp, stageLabel } from "@/lib/crm";
import { OutcomeButtons } from "../outcome-buttons";
import { ViewingForm } from "../viewing-form";
import { viewingOptions } from "../form-data";

type SP = Record<string, string | string[] | undefined>;

export default function ViewingPage({ params, searchParams }: { params: Promise<{ no: string }>; searchParams: Promise<SP> }) {
  return <Suspense fallback={<p className="muted">Loading…</p>}><Viewing params={params} searchParams={searchParams} /></Suspense>;
}

async function Viewing({ params, searchParams }: { params: Promise<{ no: string }>; searchParams: Promise<SP> }) {
  await connection();
  await requireUser();
  const { no } = await params;
  const editing = (await searchParams).edit === "1";
  const supabase = await createClient();
  const { data: v } = await supabase.from("viewings")
    .select("*, lead:leads(lead_code, name, pipeline_status), property:properties(listing_no, development:developments(name), location:locations(name)), agent:agents(full_name), ext:external_agents(agent_name)")
    .eq("viewing_no", Number(no) || -1).is("deleted_at", null).maybeSingle();
  if (!v) notFound();

  if (editing) {
    const options = await viewingOptions();
    const prop = options.properties.find((p) => p.no === v.property?.listing_no);
    return (
      <>
        <div className="page-head"><div><h1>Edit viewing #{v.viewing_no}</h1></div></div>
        <ViewingForm options={options} cancelHref={`/viewings/${v.viewing_no}`} values={{
          id: v.id, date: v.date, time: v.time?.slice(0, 5) ?? "", outcome: v.outcome, conducted_by_agent_id: v.conducted_by_agent_id,
          viewing_model: v.viewing_model ?? (v.lead_id ? "our_lead_our_property" : "sourcing_visit"), co_broke_external_agent_id: v.co_broke_external_agent_id,
          landlord_present: v.landlord_present, feedback_notes: v.feedback_notes,
          lead: v.lead ? `${v.lead.lead_code} – ${v.lead.name}` : "", property: prop ? `${prop.no} – ${prop.label}` : v.property?.listing_no ?? "",
        }} />
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}><Link href="/viewings">Viewings</Link> / #{v.viewing_no}</p>
          <h1>{date(v.date)}{v.time ? `, ${v.time.slice(0, 5)}` : ""}</h1>
          {needsFollowUp(v) && <p className="error" style={{ margin: 0 }}>Pending for 2+ days: follow up and record the outcome.</p>}
        </div>
        <Link className="btn btn-ghost btn-sm" href={`/viewings/${v.viewing_no}?edit=1`}>Edit</Link>
      </div>
      <section className="panel" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Outcome</h2>
        <OutcomeButtons id={v.id} outcome={v.outcome} />
        {v.lead && <p className="muted" style={{ margin: 0, fontSize: 13 }}>The lead is at {stageLabel(v.lead.pipeline_status)}. Interested or a past pending viewing moves it to Viewing completed; Made offer needs Gate 1 ticked on the lead.</p>}
      </section>
      <section className="panel">
        <dl className="facts">
          <dt>Lead</dt><dd>{v.lead ? <Link href={`/leads/${v.lead.lead_code}`}>{v.lead.name} ({v.lead.lead_code})</Link> : "Sourcing visit (no lead)"}</dd>
          <dt>Property</dt><dd>{v.property ? <Link href={`/properties/${v.property.listing_no}`}>{v.property.listing_no}</Link> : "—"} {[v.property?.development?.name, v.property?.location?.name].filter(Boolean).join(" · ")}</dd>
          <dt>Type</dt><dd>{label(v.viewing_model) || "—"}</dd>
          {v.ext && <><dt>Co-broke agent</dt><dd>{v.ext.agent_name}</dd></>}
          <dt>Conducted by</dt><dd>{v.agent?.full_name ?? "—"}</dd>
          <dt>Landlord present</dt><dd>{v.landlord_present ? "Yes" : "No"}</dd>
          <dt>Last follow-up</dt><dd>{v.last_follow_up ? date(v.last_follow_up) : "—"}</dd>
        </dl>
        {v.feedback_notes && <p style={{ whiteSpace: "pre-line", marginBottom: 0 }}>{v.feedback_notes}</p>}
      </section>
    </>
  );
}
