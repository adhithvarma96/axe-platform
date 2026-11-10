"use client";
import { useState, useTransition } from "react";
import { setMandate } from "./actions";

export const MANDATES: [string, string][] = [["prospect", "Prospect"], ["assessment_booked", "Assessment booked"], ["mandate_won", "Mandate won"], ["lost", "Lost"]];

export function MandatePicker({ id, value }: { id: string; value: string | null }) {
  const [v, setV] = useState(value ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="chips" role="radiogroup" aria-label="Mandate status">
        {MANDATES.map(([k, l]) => (
          <button key={k} type="button" role="radio" aria-checked={v === k} disabled={pending} className={`chip-btn${v === k ? " on" : ""}`}
            onClick={() => { const prev = v; setV(k); start(async () => { const r = await setMandate(id, k); if (r.error) { setV(prev); setErr(r.error); } else setErr(null); }); }}>{l}</button>
        ))}
      </div>
      {err && <p className="error" role="alert" style={{ margin: 0 }}>{err}</p>}
    </div>
  );
}
