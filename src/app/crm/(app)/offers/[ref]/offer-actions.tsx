"use client";
import { useState, useTransition } from "react";
import { setOfferStatus } from "../actions";

const NEXT: Record<string, { key: "sent" | "countered" | "accepted" | "rejected" | "expired"; label: string }[]> = {
  draft: [{ key: "sent", label: "Mark sent (ticks Gate 1)" }],
  sent: [{ key: "countered", label: "Countered" }, { key: "accepted", label: "Accepted" }, { key: "rejected", label: "Rejected" }, { key: "expired", label: "Expired" }],
  countered: [{ key: "accepted", label: "Accepted" }, { key: "rejected", label: "Rejected" }, { key: "expired", label: "Expired" }],
};

export function OfferActions({ refNo, status, text }: { refNo: string; status: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <button className="btn btn-sm" type="button" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setErr("Couldn't copy here."); } }}>{copied ? "Copied" : "Copy for WhatsApp"}</button>
      <button className="btn btn-ghost btn-sm" type="button" onClick={() => window.print()}>Print / save as PDF</button>
      {(NEXT[status] ?? []).map((n) => (
        <button key={n.key} className="btn btn-ghost btn-sm" type="button" disabled={pending}
          onClick={() => start(async () => { const r = await setOfferStatus(refNo, n.key); setErr(r.error ?? null); })}>{n.label}</button>
      ))}
      {err && <span className="error" role="alert" style={{ margin: 0 }}>{err}</span>}
    </div>
  );
}
