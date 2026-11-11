"use client";
import { useActionState } from "react";

export type Field =
  | { name: string; label: string; type?: "text" | "email" | "tel" | "date" | "number"; required?: boolean; placeholder?: string; wide?: boolean }
  | { name: string; label: string; type: "select"; options: [string, string][]; required?: boolean; wide?: boolean }
  | { name: string; label: string; type: "textarea"; wide?: boolean };

export type PartyState = { error?: string; ok?: boolean; duplicate?: { id: string; name: string } };

/** One simple form for the CRM's contact-type records (external agents, referral partners). */
export function PartyForm({ fields, values, action, submit, duplicateHref }: {
  fields: Field[];
  values: Record<string, string | number | null | undefined>;
  action: (prev: PartyState, f: FormData) => Promise<PartyState>;
  submit: string;
  duplicateHref?: string; // e.g. "/owners/": offers a link to the match and a Save anyway tick
}) {
  const [state, run, pending] = useActionState<PartyState, FormData>(action, {});
  return (
    <form action={run} className="form-stack" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {values.id && <input type="hidden" name="id" value={String(values.id)} />}
      <div className="form-grid">
        {fields.map((f) => {
          const v = values[f.name] ?? "";
          const id = `f-${f.name}`;
          return (
            <div key={f.name} className="field" style={f.wide || f.type === "textarea" ? { gridColumn: "1 / -1" } : undefined}>
              <label htmlFor={id}>{f.label}{"required" in f && f.required ? " *" : ""}</label>
              {f.type === "select" ? (
                <select id={id} name={f.name} defaultValue={String(v)} required={f.required}>
                  <option value="">—</option>
                  {f.options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              ) : f.type === "textarea" ? (
                <textarea id={id} name={f.name} rows={3} defaultValue={String(v)} />
              ) : (
                <input id={id} name={f.name} type={f.type ?? "text"} defaultValue={String(v)} required={f.required} placeholder={f.placeholder} step={f.type === "number" ? "any" : undefined} />
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button className="btn" type="submit" disabled={pending}>{pending ? "Saving…" : submit}</button>
        {state.ok && <span className="muted" role="status">Saved.</span>}
        {state.error && <span className="error" role="alert" style={{ margin: 0 }}>{state.error}</span>}
      </div>
      {state.duplicate && duplicateHref && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", fontSize: 14 }}>
          <a href={`${duplicateHref}${state.duplicate.id}`}>Open {state.duplicate.name}</a>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" name="confirm_duplicate" value="1" /> Save anyway (it is a different person)</label>
        </div>
      )}
    </form>
  );
}
