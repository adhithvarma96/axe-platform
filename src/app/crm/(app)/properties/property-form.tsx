"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { groupsFor, LISTING_TYPES, type Field } from "@/lib/property-fields";
import { Combo } from "../combo";
import { NewOwner } from "../owners/new-owner";
import { label } from "@/lib/format";
import { saveProperty, type FormState } from "./actions";

export interface Option { id: string; name: string; development_id?: string; hint?: string }
export interface FormOptions {
  locations: Option[]; developments: Option[]; towers: Option[]; owners: Option[];
  agents: Option[]; referral_partners: Option[]; source_channels: Option[]; features: Option[]; external_agents: Option[];
}

export function PropertyForm({ values, options, featureIds, isAdmin, cancelHref }: {
  values: Record<string, unknown>; options: FormOptions; featureIds: string[]; isAdmin: boolean; cancelHref: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProperty, {});
  const router = useRouter();
  useEffect(() => { if (state.next) router.push(state.next); }, [state.next, router]);
  const [type, setType] = useState(String(values.property_type ?? "apartment"));
  const [dev, setDev] = useState(String(values.development_id ?? ""));
  const [tower, setTower] = useState(String(values.tower_id ?? ""));
  const [owners, setOwners] = useState(options.owners);
  const [owner, setOwner] = useState(String(values.owner_id ?? ""));
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
      if (f.ref === "owners") list = owners;
      const opts = list.map((o) => ({ id: o.id, name: o.name, hint: o.hint }));
      control = f.ref === "towers" ? (
        <Combo id={id} name={f.name} options={opts} value={tower} onChange={setTower} disabled={!dev}
          placeholder={dev ? (opts.length ? "Type a tower" : "This development has no towers") : "Choose a development first"} />
      ) : f.ref === "developments" ? (
        <Combo id={id} name={f.name} options={opts} value={dev} onChange={(x) => { setDev(x); setTower(""); }} placeholder="Type a development" />
      ) : f.ref === "owners" ? (
        <Combo id={id} name={f.name} options={opts} value={owner} onChange={setOwner} placeholder="Type an owner's name or phone"
          footer={<NewOwner onCreated={(o) => { setOwners((prev) => [{ id: o.id, name: o.name, hint: o.hint }, ...prev]); setOwner(o.id); }} />} />
      ) : (
        <Combo id={id} name={f.name} options={opts} defaultValue={String(v(f.name) ?? "")} disabled={f.adminOnly && !isAdmin} placeholder="Type to search" />
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
    if (f.name === "building_name" && dev) {
      return <input key={f.name} type="hidden" name={f.name} value={String(v(f.name) ?? "")} />;
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
            {g.id === "sourcing" && (
              <div className="field">
                <label htmlFor="pf-source-agent">Sourced via external agent</label>
                <select id="pf-source-agent" name="source_external_agent" defaultValue={((values.source_agent_ids as string[]) ?? [])[0] ?? ""}>
                  <option value="">None (direct)</option>
                  {options.external_agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <small className="muted">For listings that came through another broker. <Link href="/external-agents/new">Add a new agent</Link></small>
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
