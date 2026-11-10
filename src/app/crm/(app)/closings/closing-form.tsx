"use client";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { label, money } from "@/lib/format";
import { computeSplit, type AgentHr, type Model, type Rate, type Schedule } from "@/lib/commission";
import { saveClosing, type FormState } from "./actions";

export interface ClosingOptions {
  leads: { code: string; label: string; agentId: string | null; model: Model | null; partnerId: string | null }[];
  properties: { no: string; label: string; agentId: string | null; model: Model | null; partnerId: string | null; sqft: number | null }[];
  agents: { id: string; name: string }[];
  externals: { id: string; name: string }[];
  partners: { id: string; name: string }[];
  schedules: Schedule[]; rates: Rate[]; hr: AgentHr[];
}
type V = Record<string, string | number | null>;
const MODELS: Model[] = ["company_direct", "company_via_referrer", "agent_self_sourced", "agent_via_referrer"];

/** Closing form with the commission split computed live (SPEC 8.7). The database recomputes and checks it on save. */
export function ClosingForm({ values, options }: { values: V; options: ClosingOptions }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveClosing, {});
  const router = useRouter();
  useEffect(() => { if (state.next) router.push(state.next); }, [state.next, router]);
  const str = (k: string) => (values[k] == null ? "" : String(values[k]));

  const [lead, setLead] = useState(str("lead"));
  const [prop, setProp] = useState(str("property"));
  const [date, setDate] = useState(str("closing_date"));
  const [dealType, setDealType] = useState(str("deal_type") || "rental");
  const [leadAgent, setLeadAgent] = useState(str("lead_side_agent_id"));
  const [listAgent, setListAgent] = useState(str("listing_side_agent_id"));
  const [leadModel, setLeadModel] = useState(str("lead_sourcing_model"));
  const [listModel, setListModel] = useState(str("listing_sourcing_model"));
  const [leadPartner, setLeadPartner] = useState(str("lead_side_referral_partner_id"));
  const [listPartner, setListPartner] = useState(str("listing_side_referral_partner_id"));
  const [rent, setRent] = useState(str("monthly_rent"));
  const [term, setTerm] = useState("12");
  const [value, setValue] = useState(str("total_deal_value"));
  const [dealCur, setDealCur] = useState(str("deal_currency") || "USD");
  const [ours, setOurs] = useState(str("our_commission"));
  const [comCur, setComCur] = useState(str("commission_currency") || str("deal_currency") || "USD");

  // pre-fill each side from the picked lead / property (still editable)
  const pickLead = (v: string) => {
    setLead(v);
    const l = options.leads.find((x) => v.startsWith(x.code));
    if (l) { if (l.agentId) setLeadAgent(l.agentId); if (l.model) setLeadModel(l.model); if (l.partnerId) setLeadPartner(l.partnerId); }
  };
  const pickProp = (v: string) => {
    setProp(v);
    const p = options.properties.find((x) => v.startsWith(x.no));
    if (p) { if (p.agentId) setListAgent(p.agentId); if (p.model) setListModel(p.model); if (p.partnerId) setListPartner(p.partnerId); }
  };
  // Schedule A: rentals earn one month's rent; sales 3% (suggestion only)
  const suggested = dealType === "sale" ? (Number(value) || 0) * 0.03 : Number(rent) || 0;

  const split = useMemo(() => computeSplit({
    closingDate: date, ourCommission: Number(ours) || null,
    leadModel: (leadModel || null) as Model | null, listingModel: (listModel || null) as Model | null,
    leadAgentId: leadAgent || null, listingAgentId: listAgent || null,
  }, options.schedules, options.rates, options.hr), [date, ours, leadModel, listModel, leadAgent, listAgent, options]);
  const name = (id: string) => options.agents.find((a) => a.id === id)?.name ?? "No agent";
  const partner = (id: string) => options.partners.find((a) => a.id === id)?.name ?? "—";
  const fmt = (x: number | null) => (x == null ? "—" : money(x, comCur));
  const balanced = Math.abs(split.delta) <= 1 && !!Number(ours);

  const sideSel = (label_: string, value_: string, set: (v: string) => void, name_: string) => (
    <div className="field"><label htmlFor={name_}>{label_}</label>
      <select id={name_} name={name_} value={value_} onChange={(e) => set(e.target.value)}>
        <option value="">No agent on this side</option>
        {options.agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
    </div>
  );
  const modelSel = (label_: string, value_: string, set: (v: string) => void, name_: string) => (
    <div className="field"><label htmlFor={name_}>{label_}</label>
      <select id={name_} name={name_} value={value_} onChange={(e) => set(e.target.value)}>
        <option value="">— choose —</option>
        {MODELS.map((m) => <option key={m} value={m}>{label(m)}</option>)}
      </select>
    </div>
  );

  return (
    <form action={action} className="form-stack">
      {values.id && <input type="hidden" name="id" value={str("id")} />}
      <datalist id="cl-leads">{options.leads.map((l) => <option key={l.code} value={`${l.code} – ${l.label}`} />)}</datalist>
      <datalist id="cl-props">{options.properties.map((p) => <option key={p.no} value={`${p.no} – ${p.label}`} />)}</datalist>

      <fieldset className="panel form-group">
        <legend className="section-title">The deal</legend>
        <div className="form-grid">
          <div className="field"><label htmlFor="closing_date">Closing date *</label><input id="closing_date" name="closing_date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
          <div className="field"><label htmlFor="deal_type">Deal type *</label>
            <select id="deal_type" name="deal_type" value={dealType} onChange={(e) => setDealType(e.target.value)}>
              <option value="rental">Rental</option><option value="short_let">Short-let</option><option value="sale">Sale</option>
            </select>
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="lead">Lead</label><input id="lead" name="lead" list="cl-leads" value={lead} onChange={(e) => pickLead(e.target.value)} placeholder="ARLD… or name" autoComplete="off" /></div>
          <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="property">Property</label><input id="property" name="property" list="cl-props" value={prop} onChange={(e) => pickProp(e.target.value)} placeholder="AX… or building" autoComplete="off" /></div>
          {dealType !== "sale" && <>
            <div className="field"><label htmlFor="monthly_rent">Monthly rent</label><input id="monthly_rent" name="monthly_rent" inputMode="decimal" value={rent} onChange={(e) => { setRent(e.target.value); setValue(String((Number(e.target.value) || 0) * (Number(term) || 0))); }} /></div>
            <div className="field"><label htmlFor="term">Lease term (months)</label><input id="term" inputMode="numeric" value={term} onChange={(e) => { setTerm(e.target.value); setValue(String((Number(rent) || 0) * (Number(e.target.value) || 0))); }} /></div>
          </>}
          <div className="field"><label htmlFor="total_deal_value">{dealType === "sale" ? "Sale price" : "Total deal value"}</label><input id="total_deal_value" name="total_deal_value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} /></div>
          <div className="field"><label htmlFor="deal_currency">Deal currency</label>
            <select id="deal_currency" name="deal_currency" value={dealCur} onChange={(e) => setDealCur(e.target.value)}><option>USD</option><option>LKR</option></select>
          </div>
          <div className="field"><label htmlFor="usd_lkr_rate">USD→LKR rate</label><input id="usd_lkr_rate" name="usd_lkr_rate" inputMode="decimal" defaultValue={str("usd_lkr_rate")} placeholder="Blank = central rate for the date" /></div>
          {dealType !== "sale" && <>
            <div className="field"><label htmlFor="lease_start_date">Lease start</label><input id="lease_start_date" name="lease_start_date" type="date" defaultValue={str("lease_start_date")} /></div>
            <div className="field"><label htmlFor="lease_end_date">Lease end (unit comes back then)</label><input id="lease_end_date" name="lease_end_date" type="date" defaultValue={str("lease_end_date")} /></div>
            <div className="field"><label htmlFor="rent_advance_months">Rent in advance (months)</label><input id="rent_advance_months" name="rent_advance_months" inputMode="decimal" defaultValue={str("rent_advance_months")} /></div>
            <div className="field"><label htmlFor="security_deposit_months">Deposit (months)</label><input id="security_deposit_months" name="security_deposit_months" inputMode="decimal" defaultValue={str("security_deposit_months")} /></div>
          </>}
        </div>
      </fieldset>

      <fieldset className="panel form-group">
        <legend className="section-title">Commission</legend>
        <div className="form-grid">
          <div className="field"><label htmlFor="gross_commission">Gross commission (before co-broke)</label><input id="gross_commission" name="gross_commission" inputMode="decimal" defaultValue={str("gross_commission")} /></div>
          <div className="field"><label htmlFor="co_broke_external_agent_id">Co-broke agent</label>
            <select id="co_broke_external_agent_id" name="co_broke_external_agent_id" defaultValue={str("co_broke_external_agent_id")}><option value="">None</option>{options.externals.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          </div>
          <div className="field"><label htmlFor="co_broke_split_pct">Co-broke share %</label><input id="co_broke_split_pct" name="co_broke_split_pct" inputMode="decimal" defaultValue={str("co_broke_split_pct")} /></div>
          <div className="field">
            <label htmlFor="our_commission">Our commission (after co-broke) *</label>
            <input id="our_commission" name="our_commission" inputMode="decimal" value={ours} onChange={(e) => setOurs(e.target.value)} required />
            {suggested > 0 && !ours && <small><button type="button" className="chip-btn" onClick={() => { setOurs(String(Math.round(suggested))); setComCur(dealCur); }}>Use {money(suggested, dealCur)} ({dealType === "sale" ? "3% of price" : "one month's rent"})</button></small>}
          </div>
          <div className="field"><label htmlFor="commission_currency">Commission currency *</label>
            <select id="commission_currency" name="commission_currency" value={comCur} onChange={(e) => setComCur(e.target.value)}><option>USD</option><option>LKR</option></select>
          </div>
        </div>
      </fieldset>

      <fieldset className="panel form-group">
        <legend className="section-title">Sides (each worth 50 points)</legend>
        <div className="grid-2">
          <div className="form-stack" style={{ gap: 12 }}>
            <strong>Lead side</strong>
            {sideSel("Agent", leadAgent, setLeadAgent, "lead_side_agent_id")}
            {modelSel("Sourcing model", leadModel, setLeadModel, "lead_sourcing_model")}
            {leadModel.includes("referrer") && <div className="field"><label htmlFor="lead_side_referral_partner_id">Referral partner</label>
              <select id="lead_side_referral_partner_id" name="lead_side_referral_partner_id" value={leadPartner} onChange={(e) => setLeadPartner(e.target.value)}><option value="">—</option>{options.partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>}
          </div>
          <div className="form-stack" style={{ gap: 12 }}>
            <strong>Listing side</strong>
            {sideSel("Agent", listAgent, setListAgent, "listing_side_agent_id")}
            {modelSel("Sourcing model", listModel, setListModel, "listing_sourcing_model")}
            {listModel.includes("referrer") && <div className="field"><label htmlFor="listing_side_referral_partner_id">Referral partner</label>
              <select id="listing_side_referral_partner_id" name="listing_side_referral_partner_id" value={listPartner} onChange={(e) => setListPartner(e.target.value)}><option value="">—</option>{options.partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>}
          </div>
        </div>

        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table className="split">
            <caption className="sr-only">Commission split preview</caption>
            <thead><tr><th scope="col">Side</th><th scope="col">Agent</th><th scope="col">Referrer</th><th scope="col">Axe</th></tr></thead>
            <tbody>
              {(["lead", "listing"] as const).map((k) => {
                const sd = split[k]; const agentId = k === "lead" ? leadAgent : listAgent; const pid = k === "lead" ? leadPartner : listPartner;
                return (
                  <tr key={k}>
                    <td>{k === "lead" ? "Lead" : "Listing"}<div className="muted" style={{ fontSize: 12 }}>{name(agentId)} · {sd.exempt ? "owner, exempt" : sd.tenure}</div></td>
                    <td>{fmt(sd.agent)}<div className="muted" style={{ fontSize: 12 }}>{sd.agentRate ?? "—"} pts</div></td>
                    <td>{fmt(sd.referrer)}<div className="muted" style={{ fontSize: 12 }}>{sd.referrerRate ?? "—"} pts{sd.referrerRate ? ` · ${partner(pid)}` : ""}</div></td>
                    <td>{fmt(sd.axe)}<div className="muted" style={{ fontSize: 12 }}>{sd.axeRate ?? "—"} pts</div></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr><td>Total</td><td>{fmt(split.agentTotal)}</td><td>{fmt(split.referrerTotal)}</td><td>{fmt(split.axeTotal)}</td></tr></tfoot>
          </table>
        </div>
        <p style={{ margin: "10px 0 0" }} className={balanced ? "balanced" : "unbalanced"}>
          {balanced ? "✓ Balanced" : Number(ours) ? `✗ Doesn't balance (off by ${fmt(split.delta)}). Set the sourcing model on both sides.` : "Enter our commission to see the split."}
          <span className="muted" style={{ fontWeight: 400 }}> · Schedule {split.schedule?.version ?? "?"}</span>
        </p>
        {!balanced && Number(ours) > 0 && (
          <div className="field" style={{ marginTop: 10 }}>
            <label htmlFor="split_override_reason">Save anyway: reason (logged)</label>
            <input id="split_override_reason" name="split_override_reason" defaultValue={str("split_override_reason")} placeholder="e.g. legacy deal, sides not recorded" />
          </div>
        )}
      </fieldset>

      <div className="panel field"><label htmlFor="notes">Notes</label><textarea id="notes" name="notes" rows={2} defaultValue={str("notes")} /></div>

      <div className="form-actions">
        {state.error && <p className="error" role="alert" style={{ margin: 0 }}>{state.error}</p>}
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>Saving marks the property {dealType === "sale" ? "Sold" : "Rented"} (and takes it off the website), moves the lead to Closed won, and schedules the payouts.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Saving…" : values.id ? "Save closing" : "Log closing"}</button>
          <Link className="btn btn-ghost" href="/closings">Cancel</Link>
        </div>
      </div>
    </form>
  );
}
