import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { date, label, money } from "@/lib/format";
import { ACTIVE, ALL_STAGES, initials, STAGES, stageLabel, type Stage } from "@/lib/crm";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const PAGE = 50;

export default function LeadsPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Leads</h1>
          <p className="muted">Everyone looking to rent or buy. The whole team sees the shared pipeline.</p>
        </div>
        <Link className="btn" href="/leads/new">+ Add lead</Link>
      </div>
      <Suspense fallback={<p className="muted">Loading leads…</p>}>
        <Leads searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const SELECT = "id, lead_code, name, phone, pipeline_status, urgency, looking_for, bedrooms, budget_min, budget_max, budget_currency, last_contacted, created_at, agent:agents!leads_assigned_agent_id_fkey(id, full_name), channel:source_channels(name)";

async function Leads({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const user = await requireUser();
  const sp = await searchParams;
  const view = one(sp.view) === "list" ? "list" : "board";
  const q = one(sp.q).trim();
  const stage = one(sp.stage);
  const mine = one(sp.mine) === "1";
  const agent = one(sp.agent);
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const supabase = await createClient();
  const { data: agents } = await supabase.from("agents").select("id, full_name").eq("status", "active").is("deleted_at", null).order("full_name");

  const base = () => {
    let query = supabase.from("leads").select(SELECT, { count: "exact" }).is("deleted_at", null);
    if (q) {
      const safe = q.replace(/[%,()]/g, "");
      query = /^arld/i.test(q) ? query.ilike("lead_code", `%${safe}%`) : query.or(`name.ilike.%${safe}%,phone.ilike.%${safe}%,email.ilike.%${safe}%,company.ilike.%${safe}%`);
    }
    if (mine && user.agentId) query = query.eq("assigned_agent_id", user.agentId);
    else if (agent) query = query.eq("assigned_agent_id", agent);
    return query;
  };

  const params = (over: Record<string, string>) => {
    const u = new URLSearchParams();
    Object.entries({ view, q, stage, mine: mine ? "1" : "", agent, ...over }).forEach(([k, v]) => v && u.set(k, v));
    return `/leads${u.size ? `?${u}` : ""}`;
  };

  const toolbar = (
    <form className="panel filters" action="/leads">
      <input type="hidden" name="view" value={view} />
      <div className="field" style={{ flex: "2 1 220px" }}>
        <label htmlFor="q">Search</label>
        <input id="q" name="q" defaultValue={q} placeholder="Name, phone, email, company or ARLD…" />
      </div>
      {view === "list" && (
        <div className="field">
          <label htmlFor="stage">Stage</label>
          <select id="stage" name="stage" defaultValue={stage}>
            <option value="">Active stages</option>
            {ALL_STAGES.map((s) => <option key={s} value={s}>{stageLabel(s)}</option>)}
            <option value="all">Every stage</option>
          </select>
        </div>
      )}
      <div className="field">
        <label htmlFor="agent">Agent</label>
        <select id="agent" name="agent" defaultValue={agent} disabled={mine}>
          <option value="">Everyone</option>
          {(agents ?? []).map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
        </select>
      </div>
      <label htmlFor="mine" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, fontSize: 14, fontWeight: 600 }}>
        <input id="mine" type="checkbox" name="mine" value="1" defaultChecked={mine} style={{ width: 18, height: 18, accentColor: "var(--red)" }} /> Mine only
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" type="submit">Filter</button>
        <Link className="btn btn-ghost" href={`/leads?view=${view}`}>Reset</Link>
      </div>
    </form>
  );

  const tabs = (
    <div className="seg-tabs" role="tablist" aria-label="View">
      <Link role="tab" aria-selected={view === "board"} className={view === "board" ? "on" : ""} href={params({ view: "board", page: "" })}>Pipeline board</Link>
      <Link role="tab" aria-selected={view === "list"} className={view === "list" ? "on" : ""} href={params({ view: "list" })}>List</Link>
    </div>
  );

  if (view === "board") {
    const { data: rows, error } = await base().in("pipeline_status", ACTIVE as never).order("updated_at", { ascending: false }).limit(1000);
    if (error) return <p className="error">Could not load leads: {error.message}</p>;
    const cols = STAGES.filter((s) => ACTIVE.includes(s.key));
    return (
      <>
        {toolbar}
        <div className="pager">{tabs}<span className="muted">{rows?.length ?? 0} active leads · Lost, Dormant and Closed won are in the list view</span></div>
        <div className="board">
          {cols.map((c) => {
            const items = (rows ?? []).filter((r) => r.pipeline_status === c.key);
            return (
              <section key={c.key} className="board-col" aria-label={c.label}>
                <header><span>{c.label}</span><b>{items.length}</b></header>
                <div className="board-items">
                  {items.map((l) => (
                    <Link key={l.id} href={`/leads/${l.lead_code}`} className="lead-card">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <strong>{l.name}</strong>
                        <span className="avatar" title={l.agent?.full_name ?? "Unassigned"}>{initials(l.agent?.full_name) || "?"}</span>
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {l.lead_code} · {label(l.looking_for) || "—"}{l.bedrooms ? ` · ${l.bedrooms} bed` : ""}
                      </div>
                      {(l.budget_max || l.budget_min) && <div style={{ fontSize: 13 }}>{money(l.budget_max ?? l.budget_min, l.budget_currency)}{l.looking_for === "rent" ? " /mo" : ""}</div>}
                      <div className="muted" style={{ fontSize: 12 }}>
                        {l.urgency && <span className={`badge badge-${l.urgency === "immediate" || l.urgency === "high" ? "reserved" : "soft"}`} style={{ marginRight: 6 }}>{label(l.urgency)}</span>}
                        {l.last_contacted ? `Contacted ${date(l.last_contacted)}` : "Not contacted yet"}
                      </div>
                    </Link>
                  ))}
                  {!items.length && <p className="muted" style={{ fontSize: 13, padding: "8px 4px" }}>None</p>}
                </div>
              </section>
            );
          })}
        </div>
      </>
    );
  }

  let query = base().order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (stage && stage !== "all" && ALL_STAGES.includes(stage as Stage)) query = query.eq("pipeline_status", stage as Stage);
  else if (!stage) query = query.in("pipeline_status", ACTIVE as never);
  const { data: rows, count, error } = await query;
  if (error) return <p className="error">Could not load leads: {error.message}</p>;
  const total = count ?? 0, pages = Math.max(1, Math.ceil(total / PAGE));
  return (
    <>
      {toolbar}
      <div className="pager">{tabs}<span><strong style={{ color: "var(--ink)" }}>{total.toLocaleString()} leads</strong> <span className="muted">· page {page} of {pages}</span></span></div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">Lead</th><th scope="col">Looking for</th><th scope="col">Budget</th><th scope="col">Stage</th><th scope="col">Agent</th><th scope="col">Last contacted</th></tr></thead>
          <tbody>
            {(rows ?? []).map((l) => (
              <tr key={l.id}>
                <td><Link href={`/leads/${l.lead_code}`} style={{ fontWeight: 700 }}>{l.name}</Link><div className="muted" style={{ fontSize: 12 }}>{l.lead_code}{l.channel?.name ? ` · ${l.channel.name}` : ""}</div></td>
                <td>{label(l.looking_for) || "—"}{l.bedrooms ? <div className="muted" style={{ fontSize: 12 }}>{l.bedrooms} bed</div> : null}</td>
                <td style={{ whiteSpace: "nowrap" }}>{l.budget_max || l.budget_min ? money(l.budget_max ?? l.budget_min, l.budget_currency) : "—"}</td>
                <td><span className={`badge stage-${l.pipeline_status}`}>{stageLabel(l.pipeline_status)}</span></td>
                <td>{l.agent?.full_name ?? <span className="muted">Unassigned</span>}</td>
                <td>{l.last_contacted ? date(l.last_contacted) : <span className="muted">—</span>}</td>
              </tr>
            ))}
            {!rows?.length && <tr><td colSpan={6} className="muted" style={{ padding: 24 }}>No leads match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="pager">
          {page > 1 ? <Link className="btn btn-ghost btn-sm" href={params({ page: String(page - 1) })}>← Previous</Link> : <span />}
          {page < pages && <Link className="btn btn-ghost btn-sm" href={params({ page: String(page + 1) })}>Next →</Link>}
        </div>
      )}
    </>
  );
}
