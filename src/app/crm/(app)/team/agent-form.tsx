"use client";
import { useActionState } from "react";
import { saveAgent, type TeamState } from "./actions";
import { ROLE_LABELS } from "./roles";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export type AgentFormData = {
  id: string; full_name: string; role: string; personal_phone: string | null;
  public_title: string | null; public_bio: string | null; public_email: string | null; show_on_website: boolean; website_sort: number;
  work_email: string | null; weekly_day_off: string | null; public_name: string | null; public_whatsapp: string | null;
  date_joined: string | null; probation_end_date: string | null; commission_exempt: boolean;
  targets: Record<string, number | undefined>;
};

export function AgentForm({ a, canEdit }: { a: AgentFormData; canEdit: boolean }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(saveAgent, {});
  const t = (k: string) => (a.targets[k] ?? "") as number | "";
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input type="hidden" name="agent_id" value={a.id} />
      <fieldset disabled={!canEdit || pending} style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="form-grid">
          <div className="field"><label htmlFor={`v-${a.id}`}>Viewings a week</label><input id={`v-${a.id}`} name="viewings" inputMode="numeric" defaultValue={t("viewings")} /></div>
          <div className="field"><label htmlFor={`s-${a.id}`}>Properties sourced a week</label><input id={`s-${a.id}`} name="properties_sourced" inputMode="numeric" defaultValue={t("properties_sourced")} /></div>
          <div className="field"><label htmlFor={`c-${a.id}`}>Closings a month</label><input id={`c-${a.id}`} name="closings" inputMode="numeric" defaultValue={t("closings")} /></div>
          <div className="field"><label htmlFor={`r-${a.id}`}>Revenue a month (LKR)</label><input id={`r-${a.id}`} name="revenue_lkr" inputMode="numeric" defaultValue={t("revenue_lkr")} /></div>
        </div>
        <details>
          <summary style={{ cursor: "pointer", fontSize: 14 }}>Profile and working details</summary>
          <div className="form-grid" style={{ marginTop: 10 }}>
            <div className="field"><label htmlFor={`fn-${a.id}`}>Full name</label><input id={`fn-${a.id}`} name="full_name" defaultValue={a.full_name} /></div>
            <div className="field"><label htmlFor={`ro-${a.id}`}>Role</label>
              <select id={`ro-${a.id}`} name="role" defaultValue={a.role}>{ROLE_LABELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </div>
            <div className="field"><label htmlFor={`pp-${a.id}`}>Personal phone</label><input id={`pp-${a.id}`} name="personal_phone" type="tel" defaultValue={a.personal_phone ?? ""} /></div>
            <div className="field"><label htmlFor={`e-${a.id}`}>Work email (login and alerts)</label><input id={`e-${a.id}`} name="work_email" type="email" defaultValue={a.work_email ?? ""} /></div>
            <div className="field"><label htmlFor={`d-${a.id}`}>Day off</label>
              <select id={`d-${a.id}`} name="weekly_day_off" defaultValue={a.weekly_day_off ?? ""}>
                <option value="">None</option>{DAYS.map((d) => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor={`pn-${a.id}`}>Name on the website</label><input id={`pn-${a.id}`} name="public_name" defaultValue={a.public_name ?? ""} /></div>
            <div className="field"><label htmlFor={`pt-${a.id}`}>Job title on the website</label><input id={`pt-${a.id}`} name="public_title" defaultValue={a.public_title ?? ""} placeholder="Property Consultant" /></div>
            <div className="field"><label htmlFor={`pe-${a.id}`}>Email on the website</label><input id={`pe-${a.id}`} name="public_email" type="email" defaultValue={a.public_email ?? ""} /></div>
            <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor={`pb-${a.id}`}>Bio for the team page</label><textarea id={`pb-${a.id}`} name="public_bio" rows={3} defaultValue={a.public_bio ?? ""} placeholder="2 to 4 sentences: experience, the areas and buildings they know best, languages." /></div>
            <div className="field"><label htmlFor={`ws-${a.id}`}>Order on the team page</label><input id={`ws-${a.id}`} name="website_sort" inputMode="numeric" defaultValue={a.website_sort} /></div>
            <div className="field"><label htmlFor={`pw-${a.id}`}>WhatsApp on the website</label><input id={`pw-${a.id}`} name="public_whatsapp" defaultValue={a.public_whatsapp ?? ""} placeholder="+94…" /></div>
            <div className="field"><label htmlFor={`j-${a.id}`}>Date joined</label><input id={`j-${a.id}`} name="date_joined" type="date" defaultValue={a.date_joined ?? ""} /></div>
            <div className="field"><label htmlFor={`p-${a.id}`}>Probation ends</label><input id={`p-${a.id}`} name="probation_end_date" type="date" defaultValue={a.probation_end_date ?? ""} /></div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, marginTop: 10 }}>
            <input type="checkbox" name="commission_exempt" defaultChecked={a.commission_exempt} style={{ width: 18, height: 18, accentColor: "var(--red)" }} />
            Commission-exempt (owner rule: their share goes to Axe)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, marginTop: 6 }}>
            <input type="checkbox" name="show_on_website" defaultChecked={a.show_on_website} style={{ width: 18, height: 18, accentColor: "var(--red)" }} />
            Show on the website&apos;s team page (needs a website name)
          </label>
        </details>
      </fieldset>
      {canEdit && (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn btn-sm" type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
          {state.ok && <span className="muted" role="status">Saved.</span>}
          {state.error && <span className="error" role="alert" style={{ margin: 0 }}>{state.error}</span>}
        </div>
      )}
    </form>
  );
}
