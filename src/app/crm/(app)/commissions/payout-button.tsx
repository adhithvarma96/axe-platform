"use client";
import { useState, useTransition } from "react";
import { markPayout } from "../closings/actions";
import { today } from "@/lib/crm";

export function PayoutButton({ id, paidOn }: { id: string; paidOn: string | null }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      {paidOn ? (
        <>
          <span className="badge badge-available">Paid {new Date(paidOn).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
          <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => start(async () => setErr((await markPayout(id, null)).error ?? null))}>Undo</button>
        </>
      ) : (
        <button type="button" className="btn btn-sm" disabled={pending} onClick={() => start(async () => setErr((await markPayout(id, today())).error ?? null))}>{pending ? "…" : "Mark paid"}</button>
      )}
      {err && <span className="error">{err}</span>}
    </span>
  );
}
