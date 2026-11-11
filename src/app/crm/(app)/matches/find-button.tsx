"use client";
import { useState, useTransition } from "react";
import { findMatches, type MatchState } from "./actions";

export function FindMatches({ kind, id, again }: { kind: "lead" | "property"; id: string; again: boolean }) {
  const [r, setR] = useState<MatchState>({});
  const [pending, start] = useTransition();
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
      <button type="button" className="btn btn-sm" disabled={pending} onClick={() => start(async () => setR(await findMatches(kind, id)))}>
        {pending ? "Matching…" : again ? "Find matches again" : "Find matches"}
      </button>
      {pending && <span className="muted" role="status" style={{ fontSize: 13 }}>Checking every {kind === "lead" ? "available listing" : "active lead and owner-buyer"}; this takes a few seconds.</span>}
      {!pending && r.count === 0 && <span className="muted" role="status" style={{ fontSize: 13 }}>{r.note ?? "No strong matches this time."}</span>}
      {r.error && <span className="error" role="alert" style={{ fontSize: 13 }}>{r.error}</span>}
    </span>
  );
}

export function CopyShare({ text, phone }: { text: string; phone: string | null }) {
  const [done, setDone] = useState(false);
  const wa = (phone ?? "").replace(/\D/g, "");
  return (
    <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); } catch { setDone(false); } }}>
        {done ? "Copied" : "Copy these properties"}
      </button>
      {wa.length >= 9 && <a className="btn btn-sm" style={{ background: "#25D366", borderColor: "#25D366" }} href={`https://wa.me/${wa}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">Send on WhatsApp</a>}
    </span>
  );
}
