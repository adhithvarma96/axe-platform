"use client";
import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import { submitContact, submitEnquiry, submitOwner, submitReport, type SubmitState } from "./form-actions";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "fbclid"] as const;

/** Cloudflare Turnstile widget (only when a site key is configured). */
function Turnstile() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!SITE_KEY || !ref.current) return;
    const el = ref.current;
    const w = window as unknown as { turnstile?: { render: (e: HTMLElement, o: object) => void } };
    const render = () => w.turnstile?.render(el, { sitekey: SITE_KEY, size: "flexible" });
    if (w.turnstile) { render(); return; }
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = render;
    document.head.appendChild(s);
  }, []);
  return SITE_KEY ? <div ref={ref} /> : null;
}

/** Hidden from people, irresistible to bots; plus first-touch ad tracking (UTM / fbclid). */
function Hidden() {
  const refs = useRef<Partial<Record<(typeof UTM_KEYS)[number], HTMLInputElement | null>>>({});
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const fromUrl = Object.fromEntries(UTM_KEYS.map((k) => [k, q.get(k) ?? ""]).filter(([, v]) => v));
      const stored = JSON.parse(sessionStorage.getItem("axe_utm") ?? "{}");
      const value: Record<string, string> = Object.keys(stored).length ? stored : fromUrl;
      if (!Object.keys(stored).length && Object.keys(fromUrl).length) sessionStorage.setItem("axe_utm", JSON.stringify(fromUrl));
      for (const k of UTM_KEYS) { const el = refs.current[k]; if (el) el.value = value[k] ?? ""; }
    } catch { /* storage blocked: fine */ }
  }, []);
  return (
    <>
      {UTM_KEYS.map((k) => <input key={k} type="hidden" name={k} ref={(el) => { refs.current[k] = el; }} />)}
      <div aria-hidden="true" style={{ position: "absolute", left: -10000, width: 1, height: 1, overflow: "hidden" }}>
        <label>Company website<input name="company_website" tabIndex={-1} autoComplete="off" /></label>
      </div>
    </>
  );
}

/** Submits through the server action without React's post-action form reset, so a
 *  validation error never wipes what the visitor typed. */
function useSubmit(fn: (prev: SubmitState, form: FormData) => Promise<SubmitState>) {
  const [state, action, pending] = useActionState<SubmitState, FormData>(fn, {});
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  };
  return [state, onSubmit, pending] as const;
}

function Thanks({ title, text }: { title: string; text: string }) {
  return (
    <div role="status" style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 0" }}>
      <h3 style={{ fontSize: 22 }}>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

const Consent = () => (
  <p style={{ fontSize: 12, lineHeight: 1.5 }}>By sending this you agree to Axe Realty contacting you about properties. See our <a href="/privacy-policy/">privacy policy</a>.</p>
);
const Err = ({ s }: { s: SubmitState }) => (s.error ? <p role="alert" style={{ color: "var(--red)", fontWeight: 600 }}>{s.error}</p> : null);

export function EnquiryForm({ listingNo, defaultMessage }: { listingNo: string; defaultMessage: string }) {
  const [state, onSubmit, pending] = useSubmit(submitEnquiry);
  if (state.ok) return <Thanks title="Thank you, we've got it" text={`Your enquiry${listingNo ? ` for ${listingNo}` : ""} is with our team. We'll WhatsApp you shortly.`} />;
  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>
      <input type="hidden" name="listing_no" value={listingNo} />
      <Hidden />
      <div className="s-field"><label htmlFor="en">Name *</label><input id="en" name="name" autoComplete="name" required /></div>
      <div className="s-field"><label htmlFor="ee">Email *</label><input id="ee" name="email" type="email" autoComplete="email" required /></div>
      <div className="s-field"><label htmlFor="ep">Phone (WhatsApp) *</label><input id="ep" name="phone" type="tel" autoComplete="tel" required /></div>
      <div className="s-field"><label htmlFor="em">Message</label><textarea id="em" name="message" rows={4} defaultValue={defaultMessage} /></div>
      <Turnstile /><Consent /><Err s={state} />
      <button type="submit" className="s-btn" disabled={pending}>{pending ? "Sending…" : "Send Message"}</button>
    </form>
  );
}

export function ContactForm() {
  const [state, onSubmit, pending] = useSubmit(submitContact);
  if (state.ok) return <Thanks title="Thanks for reaching out" text="We've received your message and someone from Axe Realty will get back to you shortly." />;
  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 14, position: "relative" }}>
      <Hidden />
      <div className="s-field"><label htmlFor="cn">Name *</label><input id="cn" name="name" autoComplete="name" required /></div>
      <div className="s-field"><label htmlFor="cp">Phone (WhatsApp)</label><input id="cp" name="phone" type="tel" autoComplete="tel" /></div>
      <div className="s-field" style={{ gridColumn: "1 / -1" }}><label htmlFor="ce">Email *</label><input id="ce" name="email" type="email" autoComplete="email" required /></div>
      <div className="s-field" style={{ gridColumn: "1 / -1" }}><label htmlFor="cm">Message *</label><textarea id="cm" name="message" rows={5} required /></div>
      <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 10 }}>
        <Turnstile /><Consent /><Err s={state} />
        <button type="submit" className="s-btn" disabled={pending} style={{ alignSelf: "flex-start" }}>{pending ? "Sending…" : "Send Message"}</button>
      </div>
    </form>
  );
}

export function OwnerForm({ developments }: { developments: string[] }) {
  const [state, onSubmit, pending] = useSubmit(submitOwner);
  if (state.ok) return <Thanks title="Thank you, we'll be in touch" text="An Axe Realty agent will WhatsApp you to arrange a visit and a pricing assessment." />;
  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: 14, position: "relative" }}>
      <Hidden />
      <h2 style={{ gridColumn: "1 / -1", fontSize: 24 }}>Tell us about your apartment</h2>
      <fieldset style={{ gridColumn: "1 / -1", border: 0, padding: 0, margin: 0 }}>
        <legend className="s-label" style={{ marginBottom: 6 }}>I want to</legend>
        <div className="choices seg" style={{ width: "100%" }}>
          {[["rent", "Rent it out"], ["sale", "Sell it"], ["both", "Either"]].map(([v, l], i) => (
            <label key={v} className="choice"><input type="radio" name="goal" value={v} defaultChecked={i === 0} className="sr-only" />{l}</label>
          ))}
        </div>
      </fieldset>
      <div className="s-field"><label htmlFor="on">Your name *</label><input id="on" name="name" autoComplete="name" required /></div>
      <div className="s-field"><label htmlFor="op">Phone (WhatsApp) *</label><input id="op" name="phone" type="tel" autoComplete="tel" required /></div>
      <div className="s-field" style={{ gridColumn: "1 / -1" }}><label htmlFor="oe">Email *</label><input id="oe" name="email" type="email" autoComplete="email" required /></div>
      <div className="s-field"><label htmlFor="od">Development</label>
        <input id="od" name="development" list="dev-list" placeholder="e.g. Cinnamon Life" />
        <datalist id="dev-list">{developments.map((d) => <option key={d} value={d} />)}</datalist>
      </div>
      <div className="s-field"><label htmlFor="ob">Bedrooms</label>
        <select id="ob" name="beds" defaultValue=""><option value="">Select</option><option>1</option><option>2</option><option>3</option><option>4+</option></select>
      </div>
      <div className="s-field"><label htmlFor="of">Furnishing</label>
        <select id="of" name="furnishing" defaultValue=""><option value="">Select</option><option>Fully furnished</option><option>Semi furnished</option><option>Unfurnished</option></select>
      </div>
      <div className="s-field"><label htmlFor="oa">Available from</label><input id="oa" name="available_from" type="date" /></div>
      <div className="s-field" style={{ gridColumn: "1 / -1" }}><label htmlFor="om">Anything else?</label><textarea id="om" name="notes" rows={3} placeholder="Expected price, view, tenant in place…" /></div>
      <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ fontSize: 12 }}>Your details go straight to our team, not to any third party. Your name and unit number are never published.</p>
        <Turnstile /><Err s={state} />
        <button type="submit" className="s-btn" disabled={pending}>{pending ? "Sending…" : "Get my free assessment"}</button>
      </div>
    </form>
  );
}

export function ReportForm() {
  const [state, onSubmit, pending] = useSubmit(submitReport);
  if (state.ok) return <Thanks title="Thank you" text="The Colombo Apartment Report is on its way to your inbox. If you don't see it in a few minutes, check your promotions or spam folder." />;
  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>
      <Hidden />
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="s-label" style={{ marginBottom: 6 }}>I am *</legend>
        <div className="choices">
          {[["owner", "An apartment owner"], ["buyer_investor", "A buyer / investor"], ["tenant", "Looking to rent"]].map(([v, l], i) => (
            <label key={v} className="choice"><input type="radio" name="audience" value={v} defaultChecked={i === 0} className="sr-only" />{l}</label>
          ))}
        </div>
      </fieldset>
      <div className="s-field"><label htmlFor="rn">Name</label><input id="rn" name="name" autoComplete="name" /></div>
      <div className="s-field"><label htmlFor="re">Email *</label><input id="re" name="email" type="email" autoComplete="email" required /></div>
      <div className="s-field"><label htmlFor="rw">WhatsApp</label><input id="rw" name="whatsapp" type="tel" autoComplete="tel" /></div>
      <div className="s-field"><label htmlFor="ra">Your development or area (owners)</label><input id="ra" name="development_or_area" placeholder="e.g. Altair, Colombo 02" /></div>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14 }}>
        <input type="checkbox" name="consent" required style={{ width: 18, height: 18, accentColor: "var(--red)", marginTop: 3 }} />
        <span>Email me the report and occasional Colombo apartment market updates. Unsubscribe any time.</span>
      </label>
      <Turnstile /><Err s={state} />
      <button type="submit" className="s-btn" disabled={pending}>{pending ? "Sending…" : "Send me the report"}</button>
    </form>
  );
}
