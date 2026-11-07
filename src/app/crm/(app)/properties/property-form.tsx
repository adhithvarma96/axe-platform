"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { groupsFor, LISTING_TYPES, type Field } from "@/lib/property-fields";
import { label } from "@/lib/format";
import { saveProperty, type FormState } from "./actions";

export interface Option { id: string; name: string; development_id?: string }
export interface FormOptions {
  locations: Option[]; developments: Option[]; towers: Option[]; owners: Option[];
  agents: Option[]; referral_partners: Option[]; source_channels: Option[]; features: Option[];
}

export function PropertyForm({ values, options, featureIds, isAdmin, cancelHref }: {
  values: Record<string, unknown>; options: FormOptions; featureIds: string[]; isAdmin: boolean; cancelHref: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProperty, {});
  const [type, setType] = useState(String(values.property_type ?? "apartment"));
  const [dev, setDev] = useState(String(values.development_id ?? ""));
  const v = (n: string) => values[n];

  function input(f: Field) {
    const id = `f_${f.name}`;
    const common = { id, name: f.name };
    if (f.kind === "bool") {
      return (
        <label key={f.name} htmlFor={id} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, fontSize: 14 }}>
          <input type="checkbox" {...common} defaultChecked={v(f.name) === true} style={{ width: 18, height: 18, accentColor: "var(--red)" }} /> {f.label}
        </label>
      );
    }
    let control: React.ReactNode;
    if (f.kind === "enum") {
      control = f.name === "property_type" ? (
        <select {...common} value={type} onChange={(e) => setType(e.target.value)} required>
          {f.options!.map((o) => <option key={o} value={o}>{label(o)}</option>)}
        </select>
      ) : (
        <select {...common} defaultValue={String(v(f.name) ?? "")} required={f.required}>
          {!f.required && <option value="">—</option>}
          {f.options!.map((o) => <option key={o} value={o}>{o.length <= 3 ? o.toUpperCase() : label(o)}</option>)}
        </select>
      );
    } else if (f.kind === "ref") {
      let list = options[f.ref as keyof FormOptions] ?? [];
      if (f.ref === "towers") list = list.filter((t) => t.development_id === dev);
      control = (
        <select
          {...common}
          defaultValue={String(v(f.name) ?? "")}
          key={f.ref === "towers" ? `towers-${dev}` : f.name}
          onChange={f.ref === "developments" ? (e) => setDev(e.target.value) : undefined}
          disabled={f.adminOnly && !isAdmin}
        >
          <option value="">{f.ref === "towers" && !dev ? "Choose a development first" : "—"}</option>
          {list.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      );
    } else if (f.kind === "textarea") {
      control = <textarea {...common} defaultValue={String(v(f.name) ?? "")} rows={4} />;
    } else {
      const t = f.kind === "number" || f.kind === "int" ? "number" : f.kind === "date" ? "date" : f.kind === "url" ? "url" : "text";
      control = (
        <input {...common} type={t} step={f.kind === "int" ? 1 : "any"} min={t === "number" ? 0 : undefined}
          defaultValue={v(f.name) == null ? "" : String(v(f.name)).slice(0, f.kind === "date" ? 10 : undefined)}
          disabled={f.adminOnly && !isAdmin} />
      );
    }
    return (
      <div key={f.name} className="field" style={f.kind === "textarea" ? { gridColumn: "1 / -1" } : undefined}>
        <label htmlFor={id}>{f.label}</label>
        {control}
        {f.help && <small className="muted">{f.help}</small>}
      </div>
    );
  }

  return (
    <form action={action} className="form-stack">
      {values.id ? <input type="hidden" name="id" value={String(values.id)} /> : null}
      {groupsFor(type).map((g) => (
        <fieldset key={g.id} className="panel form-group">
          <legend className="section-title">{g.title}</legend>
          <div className="form-grid">
            {g.fields.filter((f) => values.id || !f.existingOnly).map(input)}
            {g.id === "basics" && (
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="flabel-sm">Listing for</span>
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                  {LISTING_TYPES.map((t) => (
                    <label key={t} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, fontSize: 14 }}>
                      <input type="checkbox" name={`listing_type_${t}`} defaultChecked={((values.listing_types as string[]) ?? []).includes(t)} style={{ width: 18, height: 18, accentColor: "var(--red)" }} />
                      {label(t)}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {g.id === "size" && (
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="flabel-sm">Features (also drive the website lifestyle pages)</span>
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                  {options.features.map((ft) => (
                    <label key={ft.id} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, fontSize: 14 }}>
                      <input type="checkbox" name="feature" value={ft.id} defaultChecked={featureIds.includes(ft.id)} style={{ width: 18, height: 18, accentColor: "var(--red)" }} />
                      {ft.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </fieldset>
      ))}
      <div className="form-actions">
        {state.error && <p className="error" role="alert">{state.error}</p>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Saving…" : "Save property"}</button>
          <Link className="btn btn-ghost" href={cancelHref}>Cancel</Link>
        </div>
      </div>
    </form>
  );
}
