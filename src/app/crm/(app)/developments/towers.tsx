"use client";
import { useState, useTransition } from "react";
import { addTower, renameTower } from "./actions";

/** The development's towers: these feed the Tower dropdown on the property form. */
export function Towers({ developmentId, towers }: { developmentId: string; towers: { id: string; name: string }[] }) {
  const [name, setName] = useState("");
  const [edit, setEdit] = useState<{ id: string; name: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (f: () => Promise<{ error?: string }>, done: () => void) => start(async () => { const r = await f(); setErr(r.error ?? null); if (!r.error) done(); });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {towers.length ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {towers.map((t) => (
            <li key={t.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {edit?.id === t.id ? (
                <>
                  <input aria-label="Tower name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} style={{ maxWidth: 240 }} />
                  <button type="button" className="btn btn-sm" disabled={pending} onClick={() => run(() => renameTower(t.id, edit.name), () => setEdit(null))}>Save</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>{t.name}</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit({ id: t.id, name: t.name })}>Rename</button>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : <p className="muted" style={{ margin: 0 }}>No towers yet. Add them so agents can pick the tower on each listing.</p>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input aria-label="New tower name" placeholder="New tower, e.g. Tower B" value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 260 }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); run(() => addTower(developmentId, name), () => setName("")); } }} />
        <button type="button" className="btn btn-sm" disabled={pending || !name.trim()} onClick={() => run(() => addTower(developmentId, name), () => setName(""))}>+ Add tower</button>
      </div>
      {err && <p className="error" role="alert" style={{ margin: 0 }}>{err}</p>}
    </div>
  );
}
