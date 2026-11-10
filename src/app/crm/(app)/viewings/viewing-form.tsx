"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OUTCOMES, VIEWING_MODELS } from "@/lib/crm";
import { saveViewing, type FormState } from "./actions";

export interface ViewingOptions {
  properties: { no: string; label: string }[];
  leads: { code: string; label: string }[];
  agents: { id: string; name: string }[];
  externals: { id: string; name: string }[];
}

/** One-screen "log viewing" (SPEC 9.5): searchable property and lead, defaults filled in. */
export function ViewingForm({ values, options, cancelHref }: { values: Record<string, string | boolean | null>; options: ViewingOptions; cancelHref: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveViewing, {});
  const router = useRouter();
  useEffect(() => { if (state.next) router.push(state.next); }, [state.next, router]);
  const [model, setModel] = useState(String(values.viewing_model ?? "our_lead_our_property"));
  const [newLead, setNewLead] = useState(false);
  const v = (k: string) => (values[k] == null ? "" : String(values[k]));
  const cobroke = model.includes("cobroke");

  return (
    <form action={action} className="form-stack">
      {values.id && <input type="hidden" name="id" value={v("id")} />}
      <datalist id="props">{options.properties.map((p) => <option key={p.no} value={`${p.no} – ${p.label}`} />)}</datalist>
      <datalist id="leadlist">{options.leads.map((l) => <option key={l.code} value={`${l.code} – ${l.label}`} />)}</datalist>

      <div className="panel form-grid">
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="property">Property *</label>
          <input id="property" name="property" list="props" defaultValue={v("property")} placeholder="Type a listing no or building" required autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="viewing_model">Type</label>
          <select id="viewing_model" name="viewing_model" value={model} onChange={(e) => setModel(e.target.value)}>
            {VIEWING_MODELS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
        {model !== "sourcing_visit" && (
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="lead">Lead *</label>
            {!newLead ? (
              <>
                <input id="lead" name="lead" list="leadlist" defaultValue={v("lead")} placeholder="Type a name or ARLD…" autoComplete="off" />
                <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setNewLead(true)}>+ New lead instead</button>
              </>
            ) : (
              <div className="form-grid">
                <input id="lead" name="new_lead_name" placeholder="New lead's name" required />
                <input name="new_lead_phone" type="tel" placeholder="Phone / WhatsApp" />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNewLead(false)}>Pick an existing lead</button>
              </div>
            )}
          </div>
        )}
        <div className="field"><label htmlFor="date">Date *</label><input id="date" name="date" type="date" defaultValue={v("date")} required /></div>
        <div className="field"><label htmlFor="time">Time</label><input id="time" name="time" type="time" defaultValue={v("time")} /></div>
        <div className="field">
          <label htmlFor="outcome">Outcome</label>
          <select id="outcome" name="outcome" defaultValue={v("outcome") || "pending"}>
            {OUTCOMES.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="conducted_by_agent_id">Conducted by</label>
          <select id="conducted_by_agent_id" name="conducted_by_agent_id" defaultValue={v("conducted_by_agent_id")}>
            {options.agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        {cobroke && (
          <div className="field">
            <label htmlFor="co_broke_external_agent_id">Co-broke agent</label>
            <select id="co_broke_external_agent_id" name="co_broke_external_agent_id" defaultValue={v("co_broke_external_agent_id")}>
              <option value="">—</option>
              {options.externals.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}
        <label className="check" htmlFor="landlord_present"><input id="landlord_present" name="landlord_present" type="checkbox" defaultChecked={values.landlord_present === true} /> Landlord present</label>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="feedback_notes">Feedback / notes</label>
          <textarea id="feedback_notes" name="feedback_notes" rows={3} defaultValue={v("feedback_notes")} placeholder="What they liked, objections, next step" />
        </div>
      </div>
      <div className="form-actions">
        {state.error && <p className="error" role="alert" style={{ margin: 0 }}>{state.error}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Saving…" : values.id ? "Save viewing" : "Log viewing"}</button>
          <Link className="btn btn-ghost" href={cancelHref}>Cancel</Link>
        </div>
      </div>
    </form>
  );
}
