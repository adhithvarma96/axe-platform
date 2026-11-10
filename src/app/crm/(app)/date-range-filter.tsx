import Link from "next/link";
import { PRESETS, type DateRange, type RangeKey } from "@/lib/date-range";

/**
 * Preset chips plus a custom from/to form, as plain links and a GET form (works without JavaScript).
 * `keep` holds the page's other query params so switching the range doesn't reset them.
 */
export function DateRangeFilter({ path, range, keep = {}, fallback = "this_month", only }: {
  path: string; range: DateRange; keep?: Record<string, string>; fallback?: RangeKey; only?: RangeKey[];
}) {
  const href = (k: RangeKey) => `${path}?${new URLSearchParams({ ...keep, ...(k !== fallback ? { range: k } : {}) })}`;
  return (
    <div className="range-filter">
      <nav className="chips" aria-label="Date range">
        {PRESETS.filter(([k]) => !only || only.includes(k)).map(([k, l]) => (
          <Link key={k} href={href(k)} className={`chip-btn${range.key === k ? " on" : ""}`} aria-current={range.key === k ? "true" : undefined}>{l}</Link>
        ))}
      </nav>
      <form action={path} className="range-custom">
        {Object.entries(keep).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <input type="hidden" name="range" value="custom" />
        <label>From <input type="date" name="from" defaultValue={range.key === "custom" ? range.from ?? "" : ""} /></label>
        <label>To <input type="date" name="to" defaultValue={range.key === "custom" ? range.to ?? "" : ""} /></label>
        <button className={`btn btn-sm${range.key === "custom" ? "" : " btn-ghost"}`} type="submit">Apply</button>
      </form>
      <span className="muted range-label">Showing: <b>{range.label}</b>{range.from && range.key !== "custom" ? ` (${range.from} to ${range.to})` : ""}</span>
    </div>
  );
}


