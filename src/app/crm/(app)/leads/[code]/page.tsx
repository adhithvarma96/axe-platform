import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { date, label, money } from "@/lib/format";
import { needsFollowUp, outcomeLabel, stageLabel, waNumber } from "@/lib/crm";
import { StagePanel } from "./stage-panel";
import { ActivityLog, AddTask, CopyText, TaskDone } from "./lead-tools";

export default function LeadPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <Lead params={params} />
    </Suspense>
  );
}

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== false);
  if (!shown.length) return <p className="muted">Nothing recorded yet.</p>;
  return <dl className="facts">{shown.map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
}

async function Lead({ params }: { params: Promise<{ code: string }> }) {
  await connection();
  const user = await requireUser();
  const { code } = await params;
  const supabase = await createClient();
  const { data: l } = await supabase
    .from("leads")
    .select(`*, agent:agents!leads_assigned_agent_id_fkey(id, full_name, work_email), channel:source_channels(name),
      country:countries(name), ext:external_agents(id, full_name:agent_name), partner:referral_partners(full_name), owner:owners(id, full_name:name),
      lost:lost_reasons(name),
      locs:lead_preferred_locations(location:locations(name)), devs:lead_preferred_developments(development:developments(name)),
      feats:lead_features_wanted(feature:property_features(name))`)
    .ilike("lead_code", code)
    .is("deleted_at", null)
    .maybeSingle();
  if (!l) notFound();

  const [gatesQ, ticksQ, viewingsQ, actsQ, tasksQ, histQ, lostQ, agentsQ, offersQ] = await Promise.all([
    supabase.from("gate_items").select("key, gate, label, sort_order").eq("active", true).is("deleted_at", null).order("gate").order("sort_order"),
    supabase.from("lead_gate_ticks").select("gate_item_key, ticked_by, ticked_at").eq("lead_id", l.id),
    supabase.from("viewings").select("id, viewing_no, date, time, outcome, last_follow_up, feedback_notes, property:properties(listing_no, development:developments(name), location:locations(name)), agent:agents(full_name)")
      .eq("lead_id", l.id).is("deleted_at", null).order("date", { ascending: false }),
    supabase.from("activities").select("id, type, summary, at, agent:agents(full_name)").eq("lead_id", l.id).is("deleted_at", null).order("at", { ascending: false }).limit(50),
    supabase.from("tasks").select("id, title, details, due_on, status").eq("lead_id", l.id).is("deleted_at", null).neq("status", "cancelled").order("status").order("due_on"),
    supabase.from("lead_stage_history").select("from_status, to_status, changed_by, changed_at, override_reason").eq("lead_id", l.id).order("changed_at", { ascending: false }),
    supabase.from("lost_reasons").select("id, name").is("deleted_at", null).order("name"),
    supabase.from("agents").select("user_id, full_name"),
    supabase.from("offers").select("ref, status, deal_type, issued_on, valid_until, property:properties(listing_no)").eq("lead_id", l.id).is("deleted_at", null).order("version", { ascending: false }),
  ]);
  const who = new Map((agentsQ.data ?? []).map((a) => [a.user_id, a.full_name]));
  const ticks = new Map((ticksQ.data ?? []).map((t) => [t.gate_item_key, t]));
  const gates = (gatesQ.data ?? []).map((g) => {
    const t = ticks.get(g.key);
    return { key: g.key, gate: g.gate, label: g.label, ticked: !!t, tickedBy: t?.ticked_by ? who.get(t.ticked_by) ?? null : null, tickedAt: t?.ticked_at ?? null };
  });

  const wa = waNumber(l.phone);
  const budget = l.budget_min || l.budget_max
    ? `${l.budget_min ? money(l.budget_min, l.budget_currency) : ""}${l.budget_min && l.budget_max ? " – " : ""}${l.budget_max ? money(l.budget_max, l.budget_currency) : ""}${l.looking_for === "rent" ? " /month" : ""}`
    : null;
  const areas = (l.locs ?? []).map((x) => x.location?.name).filter(Boolean).join(", ");
  const buildings = (l.devs ?? []).map((x) => x.development?.name).filter(Boolean).join(", ");
  const must = (l.feats ?? []).map((x) => x.feature?.name).filter(Boolean).join(", ");
  // Requirement write-up for WhatsApp groups and co-broke agents: no client name, phone or notes.
  const lines: string[] = [
    `*Requirement – ${l.lead_code}*`,
    `${l.looking_for === "buy" ? "Looking to buy" : l.looking_for === "either" ? "Looking to rent or buy" : "Looking to rent"}: ${l.bedrooms ? `${l.bedrooms} bed ` : ""}${(l.property_types_wanted ?? []).map(label).join(" / ") || "apartment"}`,
  ];
  if (areas) lines.push(`Areas: ${areas}`);
  if (buildings) lines.push(`Buildings: ${buildings}`);
  if (budget) lines.push(`Budget: ${budget}`);
  if (l.move_in_date) lines.push(`Move-in: ${date(l.move_in_date)}`);
  if (l.purchase_timeline) lines.push(`Timeline: ${label(l.purchase_timeline)}`);
  if (must) lines.push(`Must-haves: ${must}`);
  if (l.occupants) lines.push(`Occupants: ${l.occupants}`);
  if (l.profile) lines.push(`Profile: ${label(l.profile)}`);
  lines.push("", "Please send options with photos. Axe Realty");
  const writeup = lines.join("\n");

  return (
    <>
      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}><Link href="/leads">Leads</Link> / {l.lead_code}</p>
          <h1 style={{ overflowWrap: "anywhere" }}>{l.name}</h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 14 }}>
            <span className={`badge stage-${l.pipeline_status}`}>{stageLabel(l.pipeline_status)}</span>
            {l.urgency && <span className="badge">{label(l.urgency)} urgency</span>}
            <span className="muted">Assigned to {l.agent?.full_name ?? "nobody"}</span>
            {l.lost?.name && <span className="muted">· Lost: {l.lost.name}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {wa && <a className="btn btn-sm" style={{ background: "#25D366", borderColor: "#25D366" }} href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">WhatsApp</a>}
          {l.phone && <a className="btn btn-ghost btn-sm" href={`tel:${l.phone}`}>Call</a>}
          <Link className="btn btn-ghost btn-sm" href={`/viewings/new?lead=${l.lead_code}`}>Log viewing</Link>
          <Link className="btn btn-ghost btn-sm" href={`/leads/${l.lead_code}/offer`}>Write offer</Link>
          <Link className="btn btn-ghost btn-sm" href={`/leads/${l.lead_code}/edit`}>Edit</Link>
          {user.role === "super_admin" && <Link className="btn btn-ghost btn-sm" href={`/closings/new?lead=${l.lead_code}`}>Log closing</Link>}
        </div>
      </div>

      <StagePanel leadId={l.id} stage={l.pipeline_status} gates={gates} lostReasons={lostQ.data ?? []} isAdmin={user.role === "super_admin"} />

      <div className="grid-2">
        <section className="panel">
          <h2 className="section-title">Requirements</h2>
          <Facts rows={[
            ["Looking for", label(l.looking_for)],
            ["Type", (l.property_types_wanted ?? []).map(label).join(", ")],
            ["Bedrooms", l.bedrooms], ["Occupants", l.occupants],
            ["Budget", budget],
            ["Areas", areas], ["Buildings", buildings], ["Must-haves", must],
            ["Move-in", l.move_in_date ? date(l.move_in_date) : null],
            ["Timeline", label(l.purchase_timeline)], ["Financing", label(l.financing)],
          ]} />
          {l.detailed_requirements && <p style={{ whiteSpace: "pre-line", marginBottom: 0 }}>{l.detailed_requirements}</p>}
          <div style={{ marginTop: 12 }}><CopyText text={writeup} /></div>
        </section>
        <section className="panel">
          <h2 className="section-title">Contact and source</h2>
          <Facts rows={[
            ["Phone", l.phone], ["Email", l.email], ["Company", l.company],
            ["Profile", label(l.profile)], ["Nationality", l.country?.name],
            ["Source", [label(l.lead_source_type), l.channel?.name].filter(Boolean).join(" · ")],
            ["Referring agent", l.ext?.full_name], ["Sourcing model", label(l.sourcing_model)],
            ["Referral partner", l.partner?.full_name],
            ["Also an owner", l.owner ? <Link href={`/owners/${l.owner.id}`}>{l.owner.full_name}</Link> : null],
            ["Last contacted", l.last_contacted ? date(l.last_contacted) : "Not yet"],
            ["Created", date(l.created_at)],
          ]} />
          {l.internal_notes && <p className="muted" style={{ whiteSpace: "pre-line", marginBottom: 0 }}><b>Internal notes:</b> {l.internal_notes}</p>}
        </section>
      </div>

      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h2 className="section-title" style={{ margin: 0 }}>Viewings ({viewingsQ.data?.length ?? 0})</h2>
          <Link className="btn btn-ghost btn-sm" href={`/viewings/new?lead=${l.lead_code}`}>+ Log viewing</Link>
        </div>
        {viewingsQ.data?.length ? (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="table">
              <thead><tr><th scope="col">Date</th><th scope="col">Property</th><th scope="col">Outcome</th><th scope="col">By</th></tr></thead>
              <tbody>
                {viewingsQ.data.map((v) => (
                  <tr key={v.id}>
                    <td style={{ whiteSpace: "nowrap" }}><Link href={`/viewings/${v.viewing_no}`}>{date(v.date)}</Link>{v.time ? <div className="muted" style={{ fontSize: 12 }}>{v.time.slice(0, 5)}</div> : null}</td>
                    <td>{v.property ? <Link href={`/properties/${v.property.listing_no}`}>{v.property.listing_no}</Link> : "—"}<div className="muted" style={{ fontSize: 12 }}>{[v.property?.development?.name, v.property?.location?.name].filter(Boolean).join(" · ")}</div></td>
                    <td><span className={`badge outcome-${v.outcome}`}>{outcomeLabel(v.outcome)}</span>{needsFollowUp(v) && <div className="error" style={{ fontSize: 12 }}>Follow up</div>}</td>
                    <td>{v.agent?.full_name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted">No viewings yet.</p>}
      </section>

      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h2 className="section-title" style={{ margin: 0 }}>Offers ({offersQ.data?.length ?? 0})</h2>
          <Link className="btn btn-ghost btn-sm" href={`/leads/${l.lead_code}/offer`}>{offersQ.data?.length ? "+ Revised offer" : "+ Write offer"}</Link>
        </div>
        <ul className="mini-list" style={{ marginTop: 10 }}>
          {(offersQ.data ?? []).map((o) => (
            <li key={o.ref}><Link href={`/offers/${o.ref}`}>{o.ref}</Link><span className="muted">{label(o.deal_type)}{o.property ? ` · ${o.property.listing_no}` : ""} · {label(o.status)} · valid to {date(o.valid_until)}</span></li>
          ))}
          {!offersQ.data?.length && <li className="muted">No offers yet. Saving one as sent ticks Gate 1.</li>}
        </ul>
      </section>

      <div className="grid-2">
        <section className="panel">
          <h2 className="section-title">Activity</h2>
          <ActivityLog leadId={l.id} />
          <ul className="timeline">
            {(actsQ.data ?? []).map((a) => (
              <li key={a.id}><b>{label(a.type)}</b> · {a.summary}<div className="muted" style={{ fontSize: 12 }}>{a.agent?.full_name ?? ""} · {new Date(a.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" })}</div></li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h2 className="section-title">Follow-ups</h2>
          <ul className="tasks">
            {(tasksQ.data ?? []).map((t) => (
              <li key={t.id} className={t.status === "done" ? "done" : ""}>
                <TaskDone id={t.id} done={t.status === "done"} />
                <div><div>{t.title}</div>{t.due_on && <div className="muted" style={{ fontSize: 12 }}>Due {date(t.due_on)}</div>}</div>
              </li>
            ))}
            {!tasksQ.data?.length && <li className="muted">Nothing to follow up.</li>}
          </ul>
          <AddTask leadId={l.id} />
          <h3 className="section-title" style={{ marginTop: 20, fontSize: 15 }}>Stage history</h3>
          <ul className="timeline">
            {(histQ.data ?? []).map((h, i) => (
              <li key={i}>
                {h.from_status ? `${stageLabel(h.from_status)} → ` : "Created at "}<b>{stageLabel(h.to_status)}</b>
                <div className="muted" style={{ fontSize: 12 }}>{(h.changed_by && who.get(h.changed_by)) || "System"} · {date(h.changed_at)}{h.override_reason ? ` · Override: ${h.override_reason}` : ""}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
