import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays, today } from "@/lib/crm";
import { byMonth, groupStats, median, usd, type ClosingPoint, type DealKind, type GroupStat } from "@/lib/closing-stats";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const PERIODS: [string, string, number | null][] = [["all", "All time", null], ["12m", "12 months", 365], ["6m", "6 months", 182], ["3m", "3 months", 91]];

export default function InsightsPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <>
      <nav className="muted" style={{ fontSize: 13 }}><Link href="/closings">Closings</Link> › Insights</nav>
      <div className="page-head">
        <div>
          <h1>Closing insights</h1>
          <p className="muted">What deals actually closed at, by location, development and bedrooms. Internal only; never shown on the website.</p>
        </div>
      </div>
      <Suspense fallback={<p className="muted">Loading…</p>}><Insights searchParams={searchParams} /></Suspense>
    </>
  );
}

function Bars({ rows, value, fmt, href }: { rows: GroupStat[]; value: (r: GroupStat) => number | null; fmt: (n: number) => string; href?: (r: GroupStat) => string | null }) {
  const max = Math.max(1, ...rows.map((r) => value(r) ?? 0));
  return (
    <div className="hbars" role="list">
      {rows.map((r) => {
        const v = value(r);
        const h = href?.(r);
        return (
          <div key={r.key} className="hbar" role="listitem" title={`${r.key}: ${v == null ? "no sizes recorded" : fmt(v)} · ${r.deals} deal${r.deals === 1 ? "" : "s"}`}>
            <span className="hbar-label">{h ? <Link href={h}>{r.key}</Link> : r.key}</span>
            <span className="hbar-track">{v != null && <i style={{ width: `${Math.max(2, (v / max) * 100)}%` }} />}</span>
            <span className="hbar-value">{v == null ? "—" : fmt(v)} <span className="muted">· {r.deals}</span></span>
          </div>
        );
      })}
    </div>
  );
}

function GroupTable({ rows, kind, href }: { rows: GroupStat[]; kind: DealKind; href?: (r: GroupStat) => string | null }) {
  const unit = kind === "rental" ? "/mo" : "";
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th scope="col">Group</th><th scope="col">Deals</th><th scope="col">Average{unit}</th><th scope="col">Median{unit}</th><th scope="col">Range</th><th scope="col">Per sq ft{unit}</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const h = href?.(r);
            return (
              <tr key={r.key}>
                <td>{h ? <Link href={h}>{r.key}</Link> : r.key}</td>
                <td>{r.deals}</td>
                <td style={{ whiteSpace: "nowrap" }}>{usd(r.avg)}</td>
                <td style={{ whiteSpace: "nowrap" }}>{usd(r.median)}</td>
                <td style={{ whiteSpace: "nowrap" }}>{r.deals > 1 ? `${usd(r.min)} – ${r.max.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}</td>
                <td style={{ whiteSpace: "nowrap" }}>{usd(r.psfAvg, kind === "rental" ? 2 : 0)}{r.psfDeals && r.psfDeals < r.deals ? <span className="muted"> ({r.psfDeals} with size)</span> : null}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MonthChart({ data }: { data: { month: string; deals: number; avg: number | null }[] }) {
  const max = Math.max(1, ...data.map((d) => d.deals));
  const w = 40, gap = 10, h = 140, top = 18, width = data.length * (w + gap);
  const mon = (m: string) => new Date(`${m}-15T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });
  return (
    <div className="chart-scroll">
      <svg viewBox={`0 0 ${width} ${h + 36}`} width={Math.max(width, 280)} height={h + 36} role="img" aria-label="Closings per month">
        <line x1={0} x2={width} y1={top + h} y2={top + h} stroke="var(--line)" />
        {data.map((d, i) => {
          const bh = (d.deals / max) * h;
          const x = i * (w + gap) + gap / 2;
          return (
            <g key={d.month}>
              <title>{`${mon(d.month)}: ${d.deals} closing${d.deals === 1 ? "" : "s"}${d.avg != null ? ` · average ${usd(d.avg)}` : ""}`}</title>
              <rect x={x - 2} y={top} width={w + 4} height={h} fill="transparent" />
              {d.deals > 0 && <path d={`M${x},${top + h} V${top + h - bh + 4} q0,-4 4,-4 h${w - 8} q4,0 4,4 V${top + h} Z`} fill="var(--red)" />}
              {d.deals > 0 && <text x={x + w / 2} y={top + h - bh - 5} textAnchor="middle" fontSize="12" fill="var(--ink)">{d.deals}</text>}
              <text x={x + w / 2} y={top + h + 16} textAnchor="middle" fontSize="11" fill="var(--muted)">{mon(d.month)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

async function Insights({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const user = await requireUser();
  if (user.role !== "super_admin" && user.role !== "sales_manager") return <p className="muted">Closing insights are visible to the Super Admin only.</p>;
  const sp = await searchParams;
  const kind: DealKind = one(sp.deal) === "sale" ? "sale" : "rental";
  const period = PERIODS.find(([k]) => k === one(sp.period)) ?? PERIODS[0];
  const supabase = await createClient();
  let q = supabase.from("closings")
    .select("closing_date, deal_type, monthly_rent_usd, total_deal_value_usd, property:properties(beds, square_feet, development:developments(id, name), location:locations(id, name))")
    .is("deleted_at", null);
  if (period[2]) q = q.gte("closing_date", addDays(today(), -period[2]));
  const { data, error } = await q;
  if (error) return <p className="error">{error.message}</p>;

  const devIds = new Map<string, string>(), locIds = new Map<string, string>();
  const points: ClosingPoint[] = (data ?? []).map((c) => {
    const p = c.property;
    if (p?.development) devIds.set(p.development.name, p.development.id);
    if (p?.location) locIds.set(p.location.name, p.location.id);
    return {
      date: c.closing_date, kind: c.deal_type,
      amountUsd: c.deal_type === "sale" ? c.total_deal_value_usd : c.monthly_rent_usd,
      sqft: p?.square_feet ?? null, location: p?.location?.name ?? null, development: p?.development?.name ?? null, beds: p?.beds ?? null,
    };
  });
  const mine = points.filter((p) => p.kind === kind && p.amountUsd != null && p.amountUsd > 0);
  const psfs = mine.filter((p) => p.sqft).map((p) => p.amountUsd! / p.sqft!);
  const unit = kind === "rental" ? "/mo" : "";
  const psfFmt = (n: number) => usd(n, kind === "rental" ? 2 : 0);
  const sections: { id: string; title: string; by: "location" | "development" | "beds"; link?: (r: GroupStat) => string | null }[] = [
    { id: "location", title: "By location", by: "location", link: (r) => (locIds.get(r.key) ? `/locations/${locIds.get(r.key)}` : null) },
    { id: "development", title: "By development", by: "development", link: (r) => (devIds.get(r.key) ? `/developments/${devIds.get(r.key)}` : null) },
    { id: "beds", title: "By bedrooms", by: "beds" },
  ];

  return (
    <>
      <div className="pager" style={{ flexWrap: "wrap", gap: 10 }}>
        <div className="seg-tabs">
          <Link className={kind === "rental" ? "on" : ""} href={`/closings/insights?${new URLSearchParams(period[0] !== "all" ? { period: period[0] } : {})}`}>Rentals</Link>
          <Link className={kind === "sale" ? "on" : ""} href={`/closings/insights?${new URLSearchParams({ deal: "sale", ...(period[0] !== "all" ? { period: period[0] } : {}) })}`}>Sales</Link>
        </div>
        <div className="seg-tabs">
          {PERIODS.map(([k, l]) => (
            <Link key={k} className={k === period[0] ? "on" : ""} href={`/closings/insights?${new URLSearchParams({ ...(kind === "sale" ? { deal: "sale" } : {}), ...(k !== "all" ? { period: k } : {}) })}`}>{l}</Link>
          ))}
        </div>
      </div>

      <div className="kpis" style={{ margin: 0 }}>
        <div className="kpi"><span>{kind === "rental" ? "Rentals" : "Sales"} closed</span><b>{mine.length}</b></div>
        <div className="kpi"><span>Median {kind === "rental" ? "rent" : "price"}{unit}</span><b>{mine.length ? usd(median(mine.map((p) => p.amountUsd!))) : "—"}</b></div>
        <div className="kpi"><span>Average per sq ft{unit}</span><b>{psfs.length ? psfFmt(psfs.reduce((a, b) => a + b, 0) / psfs.length) : "—"}</b></div>
        <div className="kpi"><span>Median per sq ft{unit}</span><b>{psfs.length ? psfFmt(median(psfs)) : "—"}</b></div>
      </div>

      {mine.length === 0 ? (
        <p className="muted panel" style={{ margin: 0 }}>No {kind === "rental" ? "rentals" : "sales"} closed in this period.</p>
      ) : (
        <>
          {mine.length < 5 && <p className="muted" style={{ margin: 0 }}>Only {mine.length} deal{mine.length === 1 ? "" : "s"} in this view, so treat these numbers as anecdotes, not patterns.</p>}
          <section className="panel">
            <h2 className="section-title">{kind === "rental" ? "Rentals" : "Sales"} closed per month</h2>
            <MonthChart data={byMonth(points, kind)} />
          </section>
          <nav className="chips" aria-label="Jump to">
            {sections.map((s) => <a key={s.id} className="chip-btn" href={`#${s.id}`} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>{s.title}</a>)}
          </nav>
          {sections.map((s) => {
            const rows = groupStats(points, kind, s.by);
            const withPsf = rows.filter((r) => r.psfAvg != null).sort((a, b) => s.by === "beds" ? 0 : (b.psfAvg ?? 0) - (a.psfAvg ?? 0));
            return (
              <section key={s.id} id={s.id} className="panel" style={{ display: "flex", flexDirection: "column", gap: 14, scrollMarginTop: 12 }}>
                <h2 className="section-title" style={{ margin: 0 }}>{s.title}</h2>
                <div className="insight-grid">
                  <div>
                    <h3 className="insight-h">Average {kind === "rental" ? "rent" : "price"} per sq ft{unit}</h3>
                    <Bars rows={withPsf} value={(r) => r.psfAvg} fmt={psfFmt} href={s.link} />
                  </div>
                  <div>
                    <h3 className="insight-h">Average {kind === "rental" ? "rent" : "price"}{unit}</h3>
                    <Bars rows={s.by === "beds" ? rows : [...rows].sort((a, b) => b.avg - a.avg)} value={(r) => r.avg} fmt={(n) => usd(n)} href={s.link} />
                  </div>
                </div>
                <GroupTable rows={rows} kind={kind} href={s.link} />
                <small className="muted">The small number after each bar is the deal count. USD; LKR deals use the rate recorded on the closing.</small>
              </section>
            );
          })}
        </>
      )}
    </>
  );
}
