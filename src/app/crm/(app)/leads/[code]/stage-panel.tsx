"use client";
import { useState, useTransition } from "react";
import { moveLead, setGate } from "../actions";
import { EXITS, GATED, STAGES, stageIndex, stageLabel } from "@/lib/crm";

interface Gate { key: string; gate: number; label: string; ticked: boolean; tickedBy: string | null; tickedAt: string | null }

/** Stage control with the gate checklist inline (SPEC 7.8, 9.3): tick, then advance, in one place. */
export function StagePanel({ leadId, stage, gates, lostReasons, isAdmin }: {
  leadId: string; stage: string; gates: Gate[]; lostReasons: { id: string; name: string }[]; isAdmin: boolean;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; missing?: string[] } | null>(null);
  const [target, setTarget] = useState<string>("");
  const [lostReason, setLostReason] = useState("");
  const [override, setOverride] = useState("");
  const idx = stageIndex(stage);
  const next = idx >= 0 && idx < STAGES.length - 2 ? STAGES[idx + 1] : null; // Closed won comes from a closing

  const go = (to: string) => start(async () => {
    setMsg(null);
    const r = await moveLead(leadId, to, to === "lost" ? lostReason : null, override || null);
    if (!r.ok) setMsg(r);
    else { setTarget(""); setOverride(""); }
  });
  const toggle = (key: string, on: boolean) => start(async () => {
    setMsg(null);
    const r = await setGate(leadId, key, on);
    if (!r.ok) setMsg(r);
  });

  return (
    <section className="panel" style={{ display: "flex", flexDirection: "column", gap: 14 }} aria-label="Pipeline stage">
      <ol className="stepper">
        {STAGES.map((s, i) => (
          <li key={s.key} className={i < idx ? "done" : i === idx ? "now" : ""}>
            <span>{s.label}{GATED[s.key] ? <small> · Gate {GATED[s.key]}</small> : null}</span>
          </li>
        ))}
      </ol>
      {(stage === "lost" || stage === "dormant") && <p className="protocol" style={{ margin: 0 }}>This lead is {stageLabel(stage)}. Move it back into the pipeline below if it comes alive again.</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
        {next && stage !== "closed_won" && (
          <button className="btn" type="button" disabled={pending} onClick={() => go(next.key)}>
            {pending ? "Saving…" : `Move to ${next.label}`}
          </button>
        )}
        <div className="field" style={{ flex: "1 1 200px" }}>
          <label htmlFor="to">Or move to</label>
          <select id="to" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">Choose a stage…</option>
            {STAGES.filter((s) => s.key !== stage && s.key !== "closed_won").map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            {EXITS.filter((s) => s.key !== stage).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        {target === "lost" && (
          <div className="field" style={{ flex: "1 1 200px" }}>
            <label htmlFor="lost">Lost reason</label>
            <select id="lost" value={lostReason} onChange={(e) => setLostReason(e.target.value)} required>
              <option value="">Choose…</option>
              {lostReasons.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        )}
        {target && <button className="btn btn-ghost" type="button" disabled={pending || (target === "lost" && !lostReason)} onClick={() => go(target)}>Move</button>}
      </div>
      {stage === "documentation_ready" && <p className="muted" style={{ margin: 0, fontSize: 13 }}>Closed won is set automatically when a Super Admin logs the closing.</p>}

      {msg?.error && <p className="error" role="alert" style={{ margin: 0 }}>{msg.error}</p>}
      {msg?.missing && (
        <div className="gate-block" role="alert">
          <strong>Not yet. Tick these first:</strong>
          <ul>{msg.missing.map((m) => <li key={m}>{m}</li>)}</ul>
          <span className="muted" style={{ fontSize: 12 }}>Adhith has been told about this attempt.</span>
          {isAdmin && (
            <div className="field" style={{ marginTop: 8 }}>
              <label htmlFor="override">Super Admin override: reason (logged)</label>
              <input id="override" value={override} onChange={(e) => setOverride(e.target.value)} placeholder="Why the gate can be skipped" />
            </div>
          )}
        </div>
      )}

      <div className="gates">
        {[1, 2, 3].map((g) => (
          <fieldset key={g} className="gate">
            <legend>Gate {g} · before {stageLabel(Object.entries(GATED).find(([, v]) => v === g)?.[0])}</legend>
            {gates.filter((x) => x.gate === g).map((x) => (
              <label key={x.key} className="gate-item">
                <input type="checkbox" checked={x.ticked} disabled={pending || (x.ticked && !isAdmin)}
                  onChange={(e) => toggle(x.key, e.target.checked)} />
                <span>{x.label}{x.ticked && x.tickedAt ? <small className="muted"> · {x.tickedBy ?? "ticked"}, {new Date(x.tickedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</small> : null}</span>
              </label>
            ))}
          </fieldset>
        ))}
      </div>
    </section>
  );
}
