import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { date, money } from "@/lib/format";
import { ACTIVE, addDays, needsFollowUp, STAGES, stageLabel, today } from "@/lib/crm";

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="muted">Loading dashboard…</p>}>
      <Dashboard />
    </Suspense>
  );
}

/** Monday of this week (Colombo), first of the month, financial year start (1 April). */
function windows(on: string) {
  const d = new Date(`${on}T00:00:00Z`);
  const monday = addDays(on, -((d.getUTCDay() + 6) % 7));
  const month = `${on.slice(0, 7)}-01`;
  const fyYear = d.getUTCMonth() >= 3 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  const monthEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  return { monday, month, monthEnd, fy: `${fyYear}-04-01` };
}

function Kpi({ k, v, sub, href, warn }: { k: string; v: React.ReactNode; sub?: React.ReactNode; href?: string; warn?: boolean }) {
  const body = <><span>{k}</span><b>{v}</b>{sub && <small>{sub}</small>}</>;
  return href ? <Link className={`kpi${warn ? " kpi-warn" : ""}`} href={href}>{body}</Link> : <div className={`kpi${warn ? " kpi-warn" : ""}`}>{body}</div>;
}
function Meter({ value, target }: { value: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return <div className={`meter${pct >= 100 ? " meter-ok" : ""}`} role="img" aria-label={`${pct}% of target`}><i style={{ width: `${pct}%` }} /></div>;
}

async function Dashboard() {
  await connection();
  const user = await requireUser();
  const isAdmin = user.role === "super_admin" || user.role === "sales_manager";
  const supabase = await createClient();
  const on = today();
  const w = windows(on);

  const [leadsQ, viewMonthQ, pendingQ, availQ, totalQ, comingQ, recentQ, secondQ, agentsQ, tasksQ] = await Promise.all([
    supabase.from("leads").select("id, lead_code, name, pipeline_status, assigned_agent_id, budget_max, budget_currency, looking_for, agent:agents!leads_assigned_agent_id_fkey(full_name)").is("deleted_at", null).in("pipeline_status", ACTIVE as never),
    supabase.from("viewings").select("id, conducted_by_agent_id, date").is("deleted_at", null).gte("date", w.month).lte("date", on),
    supabase.from("viewings").select("id, viewing_no, date, outcome, last_follow_up, conducted_by_agent_id, lead:leads(lead_code, name), property:properties(listing_no)").is("deleted_at", null).eq("outcome", "pending").lte("date", on),
    supabase.from("properties").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "available"),
    supabase.from("properties").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("properties").select("listing_no, next_available_date, development:developments(name)").is("deleted_at", null).eq("status", "rented").not("next_available_date", "is", null).lte("next_available_date", addDays(on, 60)).order("next_available_date").limit(12),
    supabase.from("properties").select("listing_no, last_made_available, development:developments(name)").is("deleted_at", null).gte("last_made_available", addDays(on, -30)).order("last_made_available", { ascending: false }).limit(8),
    supabase.from("viewings").select("id, viewing_no, date, lead:leads(lead_code, name), property:properties(listing_no)").is("deleted_at", null).eq("outcome", "wants_second_viewing").gte("date", addDays(on, -60)).order("date", { ascending: false }).limit(10),
    supabase.from("agents").select("id, full_name, role").eq("status", "active").is("deleted_at", null).in("role", ["agent", "sales_manager", "super_admin"]).order("full_name"),
    supabase.from("tasks").select("id, title, due_on, lead:leads(lead_code, name)").eq("status", "open").is("deleted_at", null).lte("due_on", on).eq("assignee_agent_id", user.agentId ?? "00000000-0000-0000-0000-000000000000").order("due_on").limit(20),
  ]);

  const leads = leadsQ.data ?? [];
  const followUps = (pendingQ.data ?? []).filter((v) => needsFollowUp(v, on));
  const byStage = STAGES.filter((s) => ACTIVE.includes(s.key)).map((s) => ({ ...s, n: leads.filter((l) => l.pipeline_status === s.key).length }));
  const maxStage = Math.max(1, ...byStage.map((s) => s.n));
  const neg = leads.filter((l) => l.pipeline_status === "ongoing_negotiations");
  const late = leads.filter((l) => l.pipeline_status === "deposit_paid" || l.pipeline_status === "documentation_ready");

  // team activity this week + targets (6.12)
  const [viewWeekQ, sourcedQ] = await Promise.all([
    supabase.from("viewings").select("conducted_by_agent_id").is("deleted_at", null).gte("date", w.monday).lte("date", on),
    supabase.from("properties").select("listing_agent_id").is("deleted_at", null).eq("is_bulk_import", false).gte("listing_date", w.monday).lte("listing_date", on),
  ]);
  const count = <T,>(rows: T[] | null, f: (r: T) => boolean) => (rows ?? []).filter(f).length;

  // ---- Super Admin: money ----
  let money_: null | { revenue: number; target: number; closings: number; lkr: number; usd: number; perAgent: Map<string, number> } = null;
  let targets: { agent_id: string; metric: string; period: string; target_value: number }[] = [];
  if (isAdmin) {
    const [closingsQ, targetQ, agentTargetsQ] = await Promise.all([
      supabase.from("closings").select("our_commission, commission_currency, usd_lkr_rate, referrer_total, lead_side_agent_id, listing_side_agent_id").is("deleted_at", null).gte("closing_date", w.month).lte("closing_date", w.monthEnd),
      supabase.from("company_targets").select("target_value").is("deleted_at", null).lte("effective_from", on).or(`effective_to.is.null,effective_to.gte.${on}`).order("effective_from", { ascending: false }).limit(1),
      supabase.from("agent_targets").select("agent_id, metric, period, target_value").is("deleted_at", null).lte("effective_from", on).or(`effective_to.is.null,effective_to.gte.${on}`),
    ]);
    const cl = closingsQ.data ?? [];
    const lkr = (a: number | null, c: string | null, r: number | null) => (a == null ? 0 : c === "USD" ? a * (r || 0) : a);
    const perAgent = new Map<string, number>();
    cl.forEach((c) => [...new Set([c.lead_side_agent_id, c.listing_side_agent_id].filter(Boolean))].forEach((id) => perAgent.set(id!, (perAgent.get(id!) ?? 0) + 1)));
    money_ = {
      revenue: cl.reduce((s, c) => s + lkr(c.our_commission, c.commission_currency, c.usd_lkr_rate) - lkr(c.referrer_total, c.commission_currency, c.usd_lkr_rate), 0),
      target: Number(targetQ.data?.[0]?.target_value ?? 10_000_000),
      closings: cl.length,
      lkr: cl.filter((c) => c.commission_currency === "LKR").reduce((s, c) => s + Number(c.our_commission ?? 0), 0),
      usd: cl.filter((c) => c.commission_currency === "USD").reduce((s, c) => s + Number(c.our_commission ?? 0), 0),
      perAgent,
    };
    targets = (agentTargetsQ.data ?? []).map((t) => ({ ...t, target_value: Number(t.target_value) }));
  }

  // ---- Agent: own targets and closing count (no values) ----
  let mine: null | { targets: { metric: string; period: string; target_value: number }[]; closings: number } = null;
  if (!isAdmin) {
    const [t, c] = await Promise.all([supabase.rpc("my_targets"), supabase.rpc("my_closings_count", { p_from: w.month, p_to: w.monthEnd })]);
    mine = { targets: (t.data ?? []).map((x) => ({ ...x, target_value: Number(x.target_value) })), closings: Number(c.data ?? 0) };
  }
  const target = (agentId: string | null, metric: string) =>
    isAdmin ? targets.find((t) => t.agent_id === agentId && t.metric === metric)?.target_value : mine?.targets.find((t) => t.metric === metric)?.target_value;

  const myFollowUps = followUps.filter((v) => v.conducted_by_agent_id === user.agentId);
  const myLeads = leads.filter((l) => l.assigned_agent_id === user.agentId);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{isAdmin ? "Dashboard" : `Hi ${user.fullName?.split(" ")[0] ?? ""}`}</h1>
          <p className="muted">{new Date(`${on}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Colombo" })}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn btn-sm" href="/viewings/new">+ Log viewing</Link>
          <Link className="btn btn-ghost btn-sm" href="/leads/new">+ Add lead</Link>
        </div>
      </div>

      {money_ && (
        <section className="panel" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
            <h2 className="section-title" style={{ margin: 0 }}>Revenue this month</h2>
            <span><b style={{ fontSize: 24, color: "var(--ink)" }}>{money(money_.revenue, "LKR")}</b> <span className="muted">of {money(money_.target, "LKR")} target</span></span>
          </div>
          <Meter value={money_.revenue} target={money_.target} />
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>Our commission after co-broke, less referral fees; agent payouts stay in. USD at each closing&apos;s rate.</p>
        </section>
      )}

      <div className="kpis">
        {money_ && <Kpi k="Closings this month" v={money_.closings} href="/closings" />}
        {money_ && <Kpi k="Commission this month" v={money(money_.lkr, "LKR") || "0 LKR"} sub={money_.usd ? `+ ${money(money_.usd, "USD")}` : undefined} />}
        {!isAdmin && mine && <Kpi k="My closings this month" v={mine.closings} sub={target(null, "closings") ? `target ${target(null, "closings")}` : undefined} />}
        <Kpi k="Viewings this month" v={isAdmin ? viewMonthQ.data?.length ?? 0 : count(viewMonthQ.data, (v) => v.conducted_by_agent_id === user.agentId)} href="/viewings" />
        <Kpi k={isAdmin ? "Pending follow-ups" : "My follow-ups"} v={isAdmin ? followUps.length : myFollowUps.length} href="/viewings" warn={(isAdmin ? followUps.length : myFollowUps.length) > 0} />
        <Kpi k={isAdmin ? "Active leads" : "My active leads"} v={isAdmin ? leads.length : myLeads.length} href={isAdmin ? "/leads" : "/leads?mine=1"} />
        <Kpi k="Available listings" v={availQ.count ?? 0} sub={`of ${totalQ.count ?? 0} total`} href="/properties?status=available" />
      </div>

      <section className="panel">
        <h2 className="section-title">{isAdmin ? "Team this week" : "My week vs target"}</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">Agent</th><th scope="col">Viewings (week)</th><th scope="col">Properties sourced (week)</th><th scope="col">Closings (month)</th></tr></thead>
            <tbody>
              {(agentsQ.data ?? []).filter((a) => isAdmin || a.id === user.agentId).map((a) => {
                const vw = count(viewWeekQ.data, (v) => v.conducted_by_agent_id === a.id);
                const src = count(sourcedQ.data, (p) => p.listing_agent_id === a.id);
                const cl = isAdmin ? money_?.perAgent.get(a.id) ?? 0 : mine?.closings ?? 0;
                const cell = (v: number, t: number | undefined) => t ? <span>{v} / {t} <Meter value={v} target={t} /></span> : <span>{v}</span>;
                return (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600, color: "var(--ink)" }}>{a.full_name}</td>
                    <td>{cell(vw, target(a.id, "viewings"))}</td>
                    <td>{cell(src, target(a.id, "properties_sourced"))}</td>
                    <td>{cell(cl, target(a.id, "closings"))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {isAdmin && !targets.length && <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>No agent targets set yet. Sabry and Anuk&apos;s targets (10 viewings and 3 properties a week; 5 and 3 closings a month) can be added under Team.</p>}
      </section>

      <div className="grid-2">
        <section className="panel">
          <h2 className="section-title">Pipeline by stage</h2>
          <div className="bars">
            {byStage.map((s) => (
              <Link key={s.key} href={`/leads?view=list&stage=${s.key}`} className="bar-row" style={{ textDecoration: "none", color: "inherit" }}>
                <span>{s.label}</span>
                <div className="meter"><i style={{ width: `${Math.round((s.n / maxStage) * 100)}%` }} /></div>
                <b>{s.n}</b>
              </Link>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2 className="section-title">{isAdmin ? "Follow-ups due" : "My follow-ups today"}</h2>
          <ul className="mini-list">
            {(isAdmin ? followUps : myFollowUps).slice(0, 8).map((v) => (
              <li key={v.id}><Link href={`/viewings/${v.viewing_no}`}>{v.lead?.name ?? "Sourcing visit"}</Link><span className="muted">{v.property?.listing_no} · {date(v.date)}</span></li>
            ))}
            {(tasksQ.data ?? []).map((t) => (
              <li key={t.id}><span>{t.title}</span><span className="muted">{t.lead ? <Link href={`/leads/${t.lead.lead_code}`}>{t.lead.name}</Link> : null} · {date(t.due_on)}</span></li>
            ))}
            {!(isAdmin ? followUps : myFollowUps).length && !tasksQ.data?.length && <li className="muted">All caught up.</li>}
          </ul>
        </section>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2 className="section-title">Ongoing negotiations ({neg.length})</h2>
          <ul className="mini-list">
            {neg.map((l) => <li key={l.id}><Link href={`/leads/${l.lead_code}`}>{l.name}</Link><span className="muted">{l.agent?.full_name ?? ""}{l.budget_max ? ` · ${money(l.budget_max, l.budget_currency)}` : ""}</span></li>)}
            {!neg.length && <li className="muted">None right now.</li>}
          </ul>
        </section>
        <section className="panel">
          <h2 className="section-title">Deposit and documentation ({late.length})</h2>
          <ul className="mini-list">
            {late.map((l) => <li key={l.id}><Link href={`/leads/${l.lead_code}`}>{l.name}</Link><span className="muted">{stageLabel(l.pipeline_status)} · {l.agent?.full_name ?? ""}</span></li>)}
            {!late.length && <li className="muted">None right now.</li>}
          </ul>
        </section>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2 className="section-title">Second viewings wanted</h2>
          <ul className="mini-list">
            {(secondQ.data ?? []).map((v) => <li key={v.id}><Link href={`/viewings/${v.viewing_no}`}>{v.lead?.name ?? "—"}</Link><span className="muted">{v.property?.listing_no} · {date(v.date)}</span></li>)}
            {!secondQ.data?.length && <li className="muted">None in the last 60 days.</li>}
          </ul>
        </section>
        <section className="panel">
          <h2 className="section-title">Coming available in 60 days</h2>
          <ul className="mini-list">
            {(comingQ.data ?? []).map((p) => <li key={p.listing_no}><Link href={`/properties/${p.listing_no}`}>{p.listing_no}</Link><span className="muted">{p.development?.name ?? ""} · {date(p.next_available_date)}</span></li>)}
            {(recentQ.data ?? []).map((p) => <li key={`r-${p.listing_no}`}><Link href={`/properties/${p.listing_no}`}>{p.listing_no}</Link><span className="muted">available again since {date(p.last_made_available)}</span></li>)}
            {!comingQ.data?.length && !recentQ.data?.length && <li className="muted">Nothing coming up.</li>}
          </ul>
        </section>
      </div>
    </>
  );
}
