"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fieldsFor, offerText, RENTAL_DEFAULTS, SALE_DEFAULTS, threeWorkingDays, type OfferKind, type Terms } from "@/lib/offers";
import { createOffer } from "../../../offers/actions";

export type PropertyOption = { id: string; listingNo: string; label: string; rental: Terms; sale: Terms };

export function OfferBuilder({ leadId, nextRef, today, defaultKind, properties, leadTerms }: {
  leadId: string; nextRef: string; today: string; defaultKind: OfferKind;
  properties: PropertyOption[]; leadTerms: { rental: Terms; sale: Terms };
}) {
  const router = useRouter();
  const [kind, setKind] = useState<OfferKind>(defaultKind);
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [validUntil, setValidUntil] = useState(threeWorkingDays(today));
  const prop = properties.find((p) => p.id === propertyId);
  const initial = (k: OfferKind, p?: PropertyOption): Terms => ({ ...(k === "sale" ? SALE_DEFAULTS : RENTAL_DEFAULTS), ...leadTerms[k], ...(p ? p[k] : {}) });
  const [terms, setTerms] = useState<Terms>(() => initial(defaultKind, prop));
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const reset = (k: OfferKind, pid: string) => { setTerms(initial(k, properties.find((p) => p.id === pid))); setCopied(false); };
  const text = useMemo(() => offerText(kind, nextRef, today, validUntil, terms), [kind, nextRef, today, validUntil, terms]);
  const fields = fieldsFor(kind);
  const sections = [...new Set(fields.map((f) => f.section))];

  const save = (send: boolean) => start(async () => {
    const r = await createOffer({ leadId, propertyId: propertyId || null, kind, validUntil, terms, send });
    if (r.error) { setErr(r.error); return; }
    router.push(`/offers/${r.ref}`);
  });
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setErr("Couldn't copy; select the preview text and copy it."); }
  };

  return (
    <div className="grid-2" style={{ alignItems: "start" }}>
      <section className="panel" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="kind">Offer type</label>
            <select id="kind" value={kind} onChange={(e) => { const k = e.target.value as OfferKind; setKind(k); reset(k, propertyId); }}>
              <option value="rental">Rental</option><option value="sale">Sale</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="prop">Property</label>
            <select id="prop" value={propertyId} onChange={(e) => { setPropertyId(e.target.value); reset(kind, e.target.value); }}>
              <option value="">Not linked</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.listingNo} · {p.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="valid">Valid until</label>
            <input id="valid" type="date" min={today} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>Changing the type or property re-fills the terms from the records. Every blank prints as &ldquo;N/A&rdquo;.</p>
        {sections.map((sec) => (
          <fieldset key={sec} style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="section-title" style={{ fontSize: 14, marginBottom: 8 }}>{sec}</legend>
            <div className="form-grid">
              {fields.filter((f) => f.section === sec).map((f) => (
                <div key={f.key} className="field" style={f.multiline ? { gridColumn: "1 / -1" } : undefined}>
                  <label htmlFor={`t-${f.key}`}>{f.label}</label>
                  {f.multiline
                    ? <textarea id={`t-${f.key}`} rows={3} value={terms[f.key] ?? ""} onChange={(e) => setTerms({ ...terms, [f.key]: e.target.value })} />
                    : <input id={`t-${f.key}`} value={terms[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => setTerms({ ...terms, [f.key]: e.target.value })} />}
                </div>
              ))}
            </div>
          </fieldset>
        ))}
      </section>
      <section className="panel" style={{ display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 16 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Preview · {nextRef}</h2>
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, margin: 0, maxHeight: "60vh", overflow: "auto", background: "var(--card)", padding: 12, borderRadius: 8 }}>{text}</pre>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn" type="button" disabled={pending} onClick={() => save(true)}>{pending ? "Saving…" : "Save as sent (ticks Gate 1)"}</button>
          <button className="btn btn-ghost" type="button" disabled={pending} onClick={() => save(false)}>Save draft</button>
          <button className="btn btn-ghost" type="button" onClick={copy}>{copied ? "Copied" : "Copy for WhatsApp"}</button>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>After saving you can print it or save it as a branded PDF.</p>
        {err && <p className="error" role="alert" style={{ margin: 0 }}>{err}</p>}
      </section>
    </div>
  );
}
