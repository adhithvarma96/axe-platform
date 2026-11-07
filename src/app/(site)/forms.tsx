"use client";
import { useActionState, useEffect, useRef } from "react";
import { submitEnquiry, type SubmitState } from "./form-actions";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** Cloudflare Turnstile widget (only when a site key is configured). */
function Turnstile() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!SITE_KEY || !ref.current) return;
    const el = ref.current;
    const render = () => (window as unknown as { turnstile?: { render: (e: HTMLElement, o: object) => void } }).turnstile?.render(el, { sitekey: SITE_KEY, size: "flexible" });
    if ((window as unknown as { turnstile?: unknown }).turnstile) { render(); return; }
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = render;
    document.head.appendChild(s);
  }, []);
  return SITE_KEY ? <div ref={ref} /> : null;
}

/** Hidden from people, irresistible to bots. */
const Honeypot = () => (
  <div aria-hidden="true" style={{ position: "absolute", left: -10000, width: 1, height: 1, overflow: "hidden" }}>
    <label>Company website<input name="company_website" tabIndex={-1} autoComplete="off" /></label>
  </div>
);

export function EnquiryForm({ listingNo, defaultMessage }: { listingNo: string; defaultMessage: string }) {
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitEnquiry, {});
  if (state.ok) {
    return (
      <div role="status" style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 0" }}>
        <h3 style={{ fontSize: 22 }}>Thank you, we&apos;ve got it</h3>
        <p>Your enquiry{listingNo ? ` for ${listingNo}` : ""} is with our team. We&apos;ll WhatsApp you shortly.</p>
      </div>
    );
  }
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>
      <input type="hidden" name="listing_no" value={listingNo} />
      <Honeypot />
      <div className="s-field"><label htmlFor="en">Name *</label><input id="en" name="name" autoComplete="name" required /></div>
      <div className="s-field"><label htmlFor="ee">Email *</label><input id="ee" name="email" type="email" autoComplete="email" required /></div>
      <div className="s-field"><label htmlFor="ep">Phone (WhatsApp) *</label><input id="ep" name="phone" type="tel" autoComplete="tel" required /></div>
      <div className="s-field"><label htmlFor="em">Message</label><textarea id="em" name="message" rows={4} defaultValue={defaultMessage} /></div>
      <Turnstile />
      <p style={{ fontSize: 12, lineHeight: 1.5 }}>By sending this you agree to Axe Realty contacting you about properties. See our <a href="/privacy-policy/">privacy policy</a>.</p>
      {state.error && <p role="alert" style={{ color: "var(--red)", fontWeight: 600 }}>{state.error}</p>}
      <button type="submit" className="s-btn" disabled={pending}>{pending ? "Sending…" : "Send Message"}</button>
    </form>
  );
}
