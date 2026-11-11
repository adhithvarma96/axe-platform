"use client";
import { useState, useTransition } from "react";
import { quickOwner } from "./actions";

/** "+ New owner" inside the owner picker: adds the owner and selects them without leaving the form. */
export function NewOwner({ onCreated }: { onCreated: (o: { id: string; name: string; hint?: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", email: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!open) return <button type="button" className="btn btn-ghost btn-sm" style={{ width: "100%" }} onClick={() => setOpen(true)}>+ New owner</button>;
  const save = () => start(async () => {
    const r = await quickOwner(f);
    if (r.error) { setMsg(r.error); return; }
    if (r.owner) { onCreated(r.owner); setMsg(r.existing ? `${r.owner.name} already exists with that phone or email, so they're selected.` : null); setOpen(false); setF({ name: "", phone: "", email: "" }); }
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 4 }}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } }}>
      <strong style={{ fontSize: 13 }}>New owner</strong>
      <input aria-label="Owner name" placeholder="Name *" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
      <input aria-label="Owner phone" type="tel" placeholder="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <input aria-label="Owner email" type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" className="btn btn-sm" disabled={pending} onClick={save}>{pending ? "Adding…" : "Add owner"}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {msg && <small className="error" role="alert">{msg}</small>}
    </div>
  );
}
