"use client";
import { useState, useTransition } from "react";
import { OUTCOMES } from "@/lib/crm";
import { followedUp, setOutcome } from "./actions";

/** One-tap outcome and "followed up" for a viewing (list rows and the viewing page). */
export function OutcomeButtons({ id, outcome, compact = false }: { id: string; outcome: string; compact?: boolean }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  if (compact) {
    return (
      <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
        <select aria-label="Outcome" value={outcome} disabled={pending} onChange={(e) => start(async () => setErr((await setOutcome(id, e.target.value)).error ?? null))}
          style={{ font: "inherit", fontSize: 13, minHeight: 34, borderRadius: 8, border: "1px solid var(--line)", padding: "4px 8px" }}>
          {OUTCOMES.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        {outcome === "pending" && <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => start(async () => setErr((await followedUp(id)).error ?? null))}>Followed up</button>}
        {err && <span className="error">{err}</span>}
      </span>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="chips" role="radiogroup" aria-label="Outcome">
        {OUTCOMES.map((o) => (
          <button key={o.key} type="button" role="radio" aria-checked={outcome === o.key} className={`chip-btn${outcome === o.key ? " on" : ""}`} disabled={pending}
            onClick={() => start(async () => setErr((await setOutcome(id, o.key)).error ?? null))}>{o.label}</button>
        ))}
      </div>
      {outcome === "pending" && (
        <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} disabled={pending}
          onClick={() => start(async () => setErr((await followedUp(id)).error ?? null))}>I followed up today</button>
      )}
      {err && <p className="error" style={{ margin: 0 }}>{err}</p>}
    </div>
  );
}
