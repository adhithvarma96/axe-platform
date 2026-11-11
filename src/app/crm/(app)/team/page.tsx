import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/format";
import { today } from "@/lib/crm";
import { METRICS, periods, revenueByAgent } from "@/lib/revenue";
import { AgentForm } from "./agent-form";
import { AddMember, MemberAccess } from "./members-ui";
import { CompanyTargetForm } from "./company-target";
import { WebsiteImage } from "../website-image";

export default function TeamPage() {
  return (
    <>
      <Suspense fallback={<p className="muted">Loading team…</p>}>
        <Team />
      </Suspense>
    </>
  );
}

function Progress({ v, t, fmt = String }: { v: number; t: number | undefined; fmt?: (n: number) => string }) {
  if (!t) return <span className="muted">{fmt(v)} · no target</span>;
  const pct = Math.min(100, Math.round((v / t) * 100));
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span><b style={{ color: "var(--ink)" }}>{fmt(v)}</b> <span className="muted">of {fmt(t)}</span></span>
      <span className={`meter${pct >= 100 ? " meter-ok" : ""}`} role="img" aria-label={`${pct}% of target`}><i style={{ width: `${pct}%` }} /></span>
    </span>
  );
}

async function Team() {
  await connection();
  const user = await requireUser();
  if (user.role !== "super_admin" && user.role !== "sales_manager") redirect("/dashboard");
  const supabase = await createClient();
  const on = today();
  const w = periods(on);

  const [agentsQ, hrQ, targetsQ, closingsQ, viewQ, srcQ, companyQ, tapsQ, leadsQ] = await Promise.all([
    supabase.from("agents").select("id, full_name, role, status, work_email, weekly_day_off, public_name, public_whatsapp, user_id, public_title, public_bio, public_email, public_photo, show_on_website, website_sort").is("deleted_at", null).order("status").order("full_name"),
    supabase.from("agent_hr").select("agent_id, date_joined, probation_end_date, commission_exempt, personal_phone"),
    supabase.from("agent_targets").select("agent_id, metric, target_value").is("deleted_at", null).lte("effective_from", on).or(`effective_to.is.null,effective_to.gte.${on}`),
    supabase.from("closings").select("our_commission, commission_currency, usd_lkr_rate, referrer_total, lead_side_agent_id, listing_side_agent_id").is("deleted_at", null).gte("closing_date", w.month).lte("closing_date", w.monthEnd),
    supabase.from("viewings").select("conducted_by_agent_id").is("deleted_at", null).gte("date", w.monday).lte("date", on),
    supabase.from("properties").select("listing_agent_id").is("deleted_at", null).eq("is_bulk_import", false).gte("listing_date", w.monday).lte("listing_date", on),
    supabase.from("company_targets").select("target_value").is("deleted_at", null).lte("effective_from", on).or(`effective_to.is.null,effective_to.gte.${on}`).order("effective_from", { ascending: false }).limit(1),
    supabase.from("whatsapp_clicks").select("agent_id").gte("clicked_at", `${w.month}T00:00:00+05:30`),
    supabase.from("leads").select("assigned_agent_id").is("deleted_at", null).gte("created_at", `${w.month}T00:00:00+05:30`),
  ]);
  const companyTarget = Number(companyQ.data?.[0]?.target_value ?? 10_000_000);
  const agentTargetSum = (targetsQ.data ?? []).filter((t) => t.metric === "revenue_lkr").reduce((s, t) => s + Number(t.target_value), 0);
  if (agentsQ.error) return <p className="error">Could not load the team: {agentsQ.error.message}</p>;
  const { rev, deals } = revenueByAgent(closingsQ.data ?? []);
  const lkr = (n: number) => money(Math.round(n), "LKR") || "0 LKR";

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Team &amp; targets</h1>
          <p className="muted">Each agent&apos;s targets and progress. Agents see their own count targets on their dashboard; revenue stays here.</p>
        </div>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        Viewings and properties sourced count Monday to today; closings and revenue count this calendar month. An agent&apos;s revenue is half of each closing&apos;s
        revenue (our commission less referral fees) per side they worked, so a deal where they had both sides counts in full.
      </p>
      <section className="panel" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Company target</h2>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Monthly revenue target for the whole company: {lkr(companyTarget)}. The agents&apos; own revenue targets add up to {lkr(agentTargetSum)};
          the dashboard tracks both.
        </p>
        {user.role === "super_admin" && <CompanyTargetForm value={companyTarget} />}
      </section>
      {user.role === "super_admin" && <AddMember />}
      {(agentsQ.data ?? []).map((a) => {
        const hr = hrQ.data?.find((h) => h.agent_id === a.id);
        const targets = Object.fromEntries((targetsQ.data ?? []).filter((t) => t.agent_id === a.id).map((t) => [t.metric, Number(t.target_value)]));
        const vw = (viewQ.data ?? []).filter((v) => v.conducted_by_agent_id === a.id).length;
        const src = (srcQ.data ?? []).filter((p) => p.listing_agent_id === a.id).length;
        return (
          <section key={a.id} className="panel" style={{ display: "flex", flexDirection: "column", gap: 14, opacity: a.status === "active" ? 1 : 0.6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
              <h2 className="section-title" style={{ margin: 0 }}>{a.full_name}</h2>
              <span className="muted" style={{ fontSize: 13 }}>
                {a.role.replace("_", " ")}{a.status !== "active" ? " · inactive" : ""}{a.weekly_day_off ? ` · day off ${a.weekly_day_off}` : ""}
                {hr?.probation_end_date && hr.probation_end_date >= on ? ` · probation to ${hr.probation_end_date}` : ""}{hr?.commission_exempt ? " · commission-exempt" : ""}
              </span>
            </div>
            <div className="kpis" style={{ margin: 0 }}>
              <div className="kpi"><span>{METRICS[0].label} this week</span><Progress v={vw} t={targets.viewings} /></div>
              <div className="kpi"><span>{METRICS[1].label} this week</span><Progress v={src} t={targets.properties_sourced} /></div>
              <div className="kpi"><span>{METRICS[2].label} this month</span><Progress v={deals.get(a.id) ?? 0} t={targets.closings} /></div>
              <div className="kpi"><span>Revenue this month</span><Progress v={rev.get(a.id) ?? 0} t={targets.revenue_lkr} fmt={lkr} /></div>
            </div>
            {user.role === "super_admin" && <MemberAccess id={a.id} active={a.status === "active"} hasLogin={!!a.user_id} isMe={a.id === user.agentId} />}
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              This month: {(tapsQ.data ?? []).filter((t) => t.agent_id === a.id).length} WhatsApp taps on their website listings · {(leadsQ.data ?? []).filter((l) => l.assigned_agent_id === a.id).length} new leads logged
            </p>
            {user.role === "super_admin" && (
              <WebsiteImage kind="agent" id={a.id} image={a.public_photo} ideal="headshot" square
                hint="Headshot for the website: the team page and the listing advisor card on their listings." />
            )}
            <AgentForm canEdit={user.role === "super_admin"} a={{
              id: a.id, full_name: a.full_name, role: a.role, personal_phone: hr?.personal_phone ?? null,
              public_title: a.public_title, public_bio: a.public_bio, public_email: a.public_email, show_on_website: a.show_on_website, website_sort: a.website_sort, work_email: a.work_email, weekly_day_off: a.weekly_day_off, public_name: a.public_name, public_whatsapp: a.public_whatsapp,
              date_joined: hr?.date_joined ?? null, probation_end_date: hr?.probation_end_date ?? null, commission_exempt: hr?.commission_exempt ?? false, targets,
            }} />
          </section>
        );
      })}
    </>
  );
}
