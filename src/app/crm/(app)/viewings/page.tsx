import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { date, label } from "@/lib/format";
import { addDays, daysBetween, needsFollowUp, outcomeLabel, today } from "@/lib/crm";
import { OutcomeButtons } from "./outcome-buttons";

type SP = Record<string, string | string[] | undefined>;

export default function ViewingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <>
      <div className="page-head">
        <div><h1>Viewings</h1><p className="muted">Follow-ups first: a pending viewing untouched for 2 days needs a call.</p></div>
        <Link className="btn" href="/viewings/new">+ Log viewing</Link>
      </div>
      <Suspense fallback={<p className="muted">Loading viewings…</p>}><Viewings searchParams={searchParams} /></Suspense>
    </>
  );
}

const SELECT = "id, viewing_no, date, time, outcome, last_follow_up, viewing_model, lead:leads(lead_code, name), property:properties(listing_no, development:developments(name), location:locations(name)), agent:agents(id, full_name)";
type Row = {
  id: string; viewing_no: number; date: string; time: string | null; outcome: string; last_follow_up: string | null; viewing_model: string | null;
  lead: { lead_code: string | null; name: string } | null;
  property: { listing_no: string | null; development: { name: string } | null; location: { name: string } | null } | null;
  agent: { id: string; full_name: string } | null;
};

function Table({ rows, empty, showFollow = false }: { rows: Row[]; empty: string; showFollow?: boolean }) {
  const on = today();
  if (!rows.length) return <p className="muted">{empty}</p>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th scope="col">When</th><th scope="col">Lead</th><th scope="col">Property</th><th scope="col">By</th><th scope="col">Outcome</th></tr></thead>
        <tbody>
          {rows.map((v) => (
            <tr key={v.id}>
              <td style={{ whiteSpace: "nowrap" }}>
                <Link href={`/viewings/${v.viewing_no}`} style={{ fontWeight: 700 }}>{date(v.date)}</Link>
                <div className="muted" style={{ fontSize: 12 }}>{v.time ? v.time.slice(0, 5) : ""}{showFollow ? ` · ${daysBetween(v.last_follow_up ?? v.date, on)} days untouched` : ""}</div>
              </td>
              <td>{v.lead ? <Link href={`/leads/${v.lead.lead_code}`}>{v.lead.name}</Link> : <span className="muted">{label(v.viewing_model) || "—"}</span>}</td>
              <td>{v.property ? <Link href={`/properties/${v.property.listing_no}`}>{v.property.listing_no}</Link> : "—"}<div className="muted" style={{ fontSize: 12 }}>{[v.property?.development?.name, v.property?.location?.name].filter(Boolean).join(" · ")}</div></td>
              <td>{v.agent?.full_name ?? "—"}</td>
              <td><OutcomeButtons id={v.id} outcome={v.outcome} compact /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function Viewings({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const user = await requireUser();
  const sp = await searchParams;
  const mine = sp.mine === "1";
  const tab = typeof sp.tab === "string" ? sp.tab : "follow";
  const supabase = await createClient();
  const on = today();
  const scope = <T,>(q: T) => (mine && user.agentId ? (q as unknown as { eq: (c: string, v: string) => T }).eq("conducted_by_agent_id", user.agentId) : q);

  const [pendingQ, upcomingQ, secondQ, recentQ] = await Promise.all([
    scope(supabase.from("viewings").select(SELECT).is("deleted_at", null).eq("outcome", "pending").lte("date", on).order("date")).limit(300),
    scope(supabase.from("viewings").select(SELECT).is("deleted_at", null).gt("date", on).order("date")).limit(100),
    scope(supabase.from("viewings").select(SELECT).is("deleted_at", null).eq("outcome", "wants_second_viewing").order("date", { ascending: false })).limit(100),
    scope(supabase.from("viewings").select(SELECT).is("deleted_at", null).lte("date", on).gte("date", addDays(on, -30)).order("date", { ascending: false })).limit(200),
  ]);
  const followUps = ((pendingQ.data ?? []) as Row[]).filter((v) => needsFollowUp(v, on));
  // second viewings with no later viewing of the same lead + property (7.7)
  const later = new Set(((recentQ.data ?? []) as Row[]).concat((upcomingQ.data ?? []) as Row[]).map((v) => `${v.lead?.lead_code}|${v.property?.listing_no}|${v.date}`));
  const second = ((secondQ.data ?? []) as Row[]).filter((v) => ![...later].some((k) => {
    const [lc, pn, d] = k.split("|");
    return lc === v.lead?.lead_code && pn === v.property?.listing_no && d > v.date;
  }));

  const sections = [
    { key: "follow", title: "Follow-ups due", rows: followUps, empty: "Nothing waiting. Every pending viewing has been followed up in the last 2 days.", showFollow: true },
    { key: "upcoming", title: "Upcoming", rows: (upcomingQ.data ?? []) as Row[], empty: "No viewings booked ahead." },
    { key: "second", title: "Second viewings wanted", rows: second, empty: "None waiting to be booked." },
    { key: "recent", title: "Last 30 days", rows: (recentQ.data ?? []) as Row[], empty: "No viewings in the last 30 days." },
  ];
  const cur = sections.find((x) => x.key === tab) ?? sections[0];
  const href = (t: string, m: boolean) => `/viewings?${new URLSearchParams({ ...(t !== "follow" ? { tab: t } : {}), ...(m ? { mine: "1" } : {}) })}`;

  return (
    <>
      <nav className="chips section-jump" aria-label="Viewing lists">
        {sections.map((x) => (
          <Link key={x.key} href={href(x.key, mine)} className={`chip-btn${x.key === cur.key ? " on" : ""}`} aria-current={x.key === cur.key ? "page" : undefined} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            {x.title} ({x.rows.length})
          </Link>
        ))}
      </nav>
      <div className="pager">
        <div className="seg-tabs">
          <Link className={!mine ? "on" : ""} href={href(cur.key, false)}>Everyone</Link>
          <Link className={mine ? "on" : ""} href={href(cur.key, true)}>Mine only</Link>
        </div>
        <span className="muted">{outcomeLabel("pending")} viewings in the past count as completed for the lead&apos;s stage.</span>
      </div>
      <section className="panel">
        <h2 className="section-title">{cur.title} ({cur.rows.length})</h2>
        <Table rows={cur.rows} empty={cur.empty} showFollow={cur.showFollow} />
      </section>
    </>
  );
}
