"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { promote, saveMarketingNotes, setMarketingStatus, type PromoteTarget } from "./actions";

const TARGETS: { key: PromoteTarget; label: string; hint: string }[] = [
  { key: "lead", label: "Lead", hint: "A live buyer or tenant enquiry" },
  { key: "owner", label: "Owner", hint: "Wants to list: a mandate prospect" },
  { key: "external_agent", label: "External agent", hint: "Turns out to be an industry agent" },
  { key: "referral_partner", label: "Referral partner", hint: "Will sign the referral agreement" },
];

export function Promote({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pick, setPick] = useState<PromoteTarget | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (status === "promoted") return <p className="muted" style={{ margin: 0 }}>Promoted. The linked record is shown above.</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>Only after a real conversation. Promoting creates the record pre-filled from this one (or links the existing lead or owner with the same email).</p>
      <div className="chips" role="radiogroup" aria-label="Promote to">
        {TARGETS.map((t) => (
          <button key={t.key} type="button" role="radio" aria-checked={pick === t.key} title={t.hint} className={`chip-btn${pick === t.key ? " on" : ""}`} onClick={() => setPick(t.key)}>{t.label}</button>
        ))}
      </div>
      {pick && <p className="muted" style={{ margin: 0, fontSize: 13 }}>{TARGETS.find((t) => t.key === pick)?.hint}</p>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn-sm" type="button" disabled={!pick || pending}
          onClick={() => start(async () => { const r = await promote(id, pick!); setErr(r.error ?? null); if (r.href) router.push(r.href); })}>
          {pending ? "Promoting…" : pick ? `Promote to ${TARGETS.find((t) => t.key === pick)?.label.toLowerCase()}` : "Choose what they are"}
        </button>
        {status !== "disqualified" ? (
          <button className="btn btn-ghost btn-sm" type="button" disabled={pending} onClick={() => start(async () => { const r = await setMarketingStatus(id, "disqualified"); setErr(r.error ?? null); })}>Disqualify</button>
        ) : (
          <button className="btn btn-ghost btn-sm" type="button" disabled={pending} onClick={() => start(async () => { const r = await setMarketingStatus(id, "nurturing"); setErr(r.error ?? null); })}>Back to nurturing</button>
        )}
      </div>
      {err && <p className="error" role="alert" style={{ margin: 0 }}>{err}</p>}
    </div>
  );
}

export function StatusPicker({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  if (status === "promoted") return null;
  return (
    <div className="field" style={{ maxWidth: 220 }}>
      <label htmlFor="mstatus">Status</label>
      <select id="mstatus" defaultValue={status} disabled={pending}
        onChange={(e) => start(async () => { await setMarketingStatus(id, e.target.value as never); })}>
        {["new", "nurturing", "engaged", "unsubscribed", "disqualified"].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
      </select>
    </div>
  );
}

export function Notes({ id, notes }: { id: string; notes: string | null }) {
  const [text, setText] = useState(notes ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveMarketingNotes(id, text); setSaved(!!r.ok); }); }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="field"><label htmlFor="mnotes">Notes from the conversation</label><textarea id="mnotes" rows={3} value={text} onChange={(e) => { setText(e.target.value); setSaved(false); }} /></div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button className="btn btn-ghost btn-sm" type="submit" disabled={pending}>{pending ? "Saving…" : "Save notes"}</button>
        {saved && <span className="muted" role="status">Saved.</span>}
      </div>
    </form>
  );
}
