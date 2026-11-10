"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { label } from "@/lib/format";
import { saveLead, type FormState } from "./actions";

export interface Opt { id: string; name: string }
export interface LeadOptions {
  agents: Opt[]; channels: Opt[]; externals: Opt[]; partners: Opt[]; owners: Opt[];
  locations: Opt[]; developments: Opt[]; features: Opt[]; countries: { code: string; name: string }[];
}
type V = Record<string, unknown>;

const ENUMS = {
  profile: ["expat", "diplomatic", "corporate", "local"],
  lead_source_type: ["direct", "via_agent"],
  looking_for: ["rent", "buy", "either"],
  purchase_timeline: ["immediate", "months_1_3", "months_3_6", "months_6_plus"],
  financing: ["cash", "bank_loan", "part_cash_part_loan"],
  urgency: ["low", "medium", "high", "immediate"],
  sourcing_model: ["company_direct", "company_via_referrer", "agent_self_sourced", "agent_via_referrer"],
};
const TIMELINE: Record<string, string> = { immediate: "Immediate", months_1_3: "1–3 months", months_3_6: "3–6 months", months_6_plus: "6+ months" };

export function LeadForm({ values, options, selected, defaultAgent, cancelHref }: {
  values: V; options: LeadOptions; selected: { locations: string[]; developments: string[]; features: string[] }; defaultAgent: string | null; cancelHref: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveLead, {});
  const router = useRouter();
  useEffect(() => { if (state.next) router.push(state.next); }, [state.next, router]);
  const [source, setSource] = useState(String(values.lead_source_type ?? "direct"));
  const [sourcing, setSourcing] = useState(String(values.sourcing_model ?? ""));
  const [looking, setLooking] = useState(String(values.looking_for ?? "rent"));
  const v = (k: string) => (values[k] == null ? "" : String(values[k]));
  const isNew = !values.id;

  const sel = (name: string, opts: string[], fmt: (o: string) => string = label, required = false) => (
    <div className="field">
      <label htmlFor={name}>{label(name).replace(/ id$/, "")}{required ? " *" : ""}</label>
      <select id={name} name={name} defaultValue={v(name)} required={required}>
        {!required && <option value="">—</option>}
        {opts.map((o) => <option key={o} value={o}>{fmt(o)}</option>)}
      </select>
    </div>
  );
  const ref = (name: string, text: string, list: Opt[], def = "") => (
    <div className="field">
      <label htmlFor={name}>{text}</label>
      <select id={name} name={name} defaultValue={v(name) || def}>
        <option value="">—</option>
        {list.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
  const checks = (name: string, list: Opt[], picked: string[]) => (
    <div className="check-grid">
      {list.map((o) => (
        <label key={o.id} className="check"><input type="checkbox" name={name} value={o.id} defaultChecked={picked.includes(o.id)} /> {o.name}</label>
      ))}
    </div>
  );

  return (
    <form action={action} className="form-stack">
      {!isNew && <input type="hidden" name="id" value={v("id")} />}

      <fieldset className="panel form-group">
        <legend className="section-title">Who</legend>
        <div className="form-grid">
          <div className="field"><label htmlFor="name">Name *</label><input id="name" name="name" defaultValue={v("name")} required autoComplete="off" /></div>
          <div className="field"><label htmlFor="phone">Phone / WhatsApp</label><input id="phone" name="phone" type="tel" defaultValue={v("phone")} /></div>
          <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" defaultValue={v("email")} /></div>
          <div className="field"><label htmlFor="company">Company</label><input id="company" name="company" defaultValue={v("company")} /></div>
          {sel("profile", ENUMS.profile)}
          <div className="field">
            <label htmlFor="nationality_code">Nationality</label>
            <select id="nationality_code" name="nationality_code" defaultValue={v("nationality_code")}>
              <option value="">—</option>
              {options.countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="panel form-group">
        <legend className="section-title">What they want</legend>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="looking_for">Looking for *</label>
            <select id="looking_for" name="looking_for" value={looking} onChange={(e) => setLooking(e.target.value)} required>
              {ENUMS.looking_for.map((o) => <option key={o} value={o}>{label(o)}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="bedrooms">Bedrooms</label><input id="bedrooms" name="bedrooms" type="number" min={0} max={10} defaultValue={v("bedrooms")} /></div>
          <div className="field"><label htmlFor="occupants">Occupants</label><input id="occupants" name="occupants" type="number" min={1} max={20} defaultValue={v("occupants")} /></div>
          <div className="field"><label htmlFor="budget_min">Budget from</label><input id="budget_min" name="budget_min" inputMode="numeric" defaultValue={v("budget_min")} /></div>
          <div className="field"><label htmlFor="budget_max">Budget up to</label><input id="budget_max" name="budget_max" inputMode="numeric" defaultValue={v("budget_max")} /></div>
          {sel("budget_currency", ["USD", "LKR"], (o) => o)}
          {looking !== "buy" && <div className="field"><label htmlFor="move_in_date">Move-in date</label><input id="move_in_date" name="move_in_date" type="date" defaultValue={v("move_in_date")} /></div>}
          {looking !== "rent" && sel("purchase_timeline", ENUMS.purchase_timeline, (o) => TIMELINE[o])}
          {looking !== "rent" && sel("financing", ENUMS.financing)}
          {sel("urgency", ENUMS.urgency)}
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <span className="flabel-sm">Property type</span>
          <div className="check-grid">
            {["apartment", "house", "villa", "land", "commercial"].map((t) => (
              <label key={t} className="check"><input type="checkbox" name="property_types_wanted" value={t} defaultChecked={((values.property_types_wanted as string[]) ?? ["apartment"]).includes(t)} /> {label(t)}</label>
            ))}
          </div>
        </div>
        <details style={{ marginTop: 14 }} open={selected.locations.length > 0}>
          <summary className="flabel-sm" style={{ cursor: "pointer" }}>Preferred areas ({selected.locations.length})</summary>
          {checks("location_ids", options.locations, selected.locations)}
        </details>
        <details style={{ marginTop: 10 }} open={selected.developments.length > 0}>
          <summary className="flabel-sm" style={{ cursor: "pointer" }}>Preferred buildings ({selected.developments.length})</summary>
          {checks("development_ids", options.developments, selected.developments)}
        </details>
        <div className="field" style={{ marginTop: 14 }}>
          <span className="flabel-sm">Must-haves</span>
          {checks("feature_ids", options.features, selected.features)}
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="detailed_requirements">Detailed requirements</label>
          <textarea id="detailed_requirements" name="detailed_requirements" rows={3} defaultValue={v("detailed_requirements")} />
        </div>
      </fieldset>

      <fieldset className="panel form-group">
        <legend className="section-title">Source and assignment</legend>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="lead_source_type">Came in</label>
            <select id="lead_source_type" name="lead_source_type" value={source} onChange={(e) => setSource(e.target.value)}>
              {ENUMS.lead_source_type.map((o) => <option key={o} value={o}>{label(o)}</option>)}
            </select>
          </div>
          {ref("source_channel_id", "Source channel", options.channels)}
          {source === "via_agent" && ref("referring_external_agent_id", "Referring agent", options.externals)}
          {ref("assigned_agent_id", "Assigned agent *", options.agents, defaultAgent ?? "")}
          <div className="field">
            <label htmlFor="sourcing_model">Sourcing model (drives commission)</label>
            <select id="sourcing_model" name="sourcing_model" value={sourcing} onChange={(e) => setSourcing(e.target.value)}>
              <option value="">—</option>
              {ENUMS.sourcing_model.map((o) => <option key={o} value={o}>{label(o)}</option>)}
            </select>
          </div>
          {sourcing.includes("referrer") && ref("referral_partner_id", "Referral partner *", options.partners)}
          {ref("linked_owner_id", "Also an owner?", options.owners)}
          {isNew && (
            <div className="field">
              <label htmlFor="pipeline_status">Start at</label>
              <select id="pipeline_status" name="pipeline_status" defaultValue="new">
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
              </select>
            </div>
          )}
          <div className="field"><label htmlFor="last_contacted">Last contacted</label><input id="last_contacted" name="last_contacted" type="date" defaultValue={v("last_contacted")} /></div>
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="internal_notes">Internal notes</label>
          <textarea id="internal_notes" name="internal_notes" rows={2} defaultValue={v("internal_notes")} />
        </div>
      </fieldset>

      <div className="form-actions">
        {state.error && <p className="error" role="alert" style={{ margin: 0 }}>{state.error}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Saving…" : isNew ? "Add lead" : "Save changes"}</button>
          <Link className="btn btn-ghost" href={cancelHref}>Cancel</Link>
        </div>
      </div>
    </form>
  );
}
