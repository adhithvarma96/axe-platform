"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRecord, restoreRecord, type DeleteResult } from "./actions";
import type { Deletable } from "./rules";

/** Super Admin delete with an in-page confirm. Linked records block it and are listed. */
export function DeleteButton({ table, id, what }: { table: Deletable; id: string; what: string }) {
  const [step, setStep] = useState<"idle" | "confirm">("idle");
  const [r, setR] = useState<DeleteResult>({});
  const [pending, start] = useTransition();
  const router = useRouter();
  if (step === "idle") return <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => { setR({}); setStep("confirm"); }}>Delete</button>;
  return (
    <div className="delete-box" role="alertdialog" aria-label={`Delete ${what}`}>
      {r.blockers ? (
        <>
          <strong>Can&apos;t delete {what} yet</strong>
          <span>It still has {r.blockers.join(", ")}. Move those to the record you&apos;re keeping, then delete this one.</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep("idle")}>OK</button>
        </>
      ) : (
        <>
          <strong>Delete {what}?</strong>
          <span>It moves to the Deleted bin, where you can restore it.</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-sm btn-danger-solid" disabled={pending}
              onClick={() => start(async () => { const res = await deleteRecord(table, id); setR(res); if (res.next) router.push(res.next); })}>
              {pending ? "Checking…" : "Yes, delete"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep("idle")}>Cancel</button>
          </div>
          {r.error && <span className="error" role="alert">{r.error}</span>}
        </>
      )}
    </div>
  );
}

export function RestoreButton({ table, id }: { table: Deletable; id: string }) {
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" className="btn btn-ghost btn-sm" disabled={pending}
        onClick={() => start(async () => { const r = await restoreRecord(table, id); setErr(r.error ?? null); })}>{pending ? "Restoring…" : "Restore"}</button>
      {err && <span className="error" role="alert" style={{ fontSize: 13 }}>{err}</span>}
    </span>
  );
}
