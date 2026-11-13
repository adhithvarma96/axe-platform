"use client";
// Website tracking: Google Tag Manager, Google Analytics 4 and the Meta Pixel.
// Each loads only when its ID is set (Vercel env, production website project only),
// so staging, previews and the CRM are never tracked.
//
// GA4 and the Pixel are loaded here directly and every conversion is sent from code,
// so nothing has to be configured inside GTM. GTM is loaded for extra tags later
// (Google Ads, TikTok, Hotjar ...). Do NOT also add GA4 or Meta Pixel tags inside GTM:
// every visit would be counted twice.
//
// Never send names, emails or phone numbers to these services (privacy + Google's terms).
import Script from "next/script";
import { useEffect } from "react";

const GTM = process.env.NEXT_PUBLIC_GTM_ID;
const GA = process.env.NEXT_PUBLIC_GA_ID;
const PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID;

type Fbq = ((...a: unknown[]) => void) & { queue?: unknown[]; callMethod?: (...a: unknown[]) => void; loaded?: boolean; version?: string; push?: unknown };
type Win = Window & { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void; fbq?: Fbq; _fbq?: Fbq };
const w = () => (typeof window === "undefined" ? null : (window as Win));

/** Starts the GA4 and Pixel queues (Google's and Meta's own stubs). Events sent before the
 *  scripts arrive wait in the queue instead of being lost. Safe to call any number of times. */
function init(win: Win) {
  win.dataLayer = win.dataLayer ?? [];
  if (GA && !win.gtag) {
    win.gtag = function gtag() { win.dataLayer!.push(arguments); }; // eslint-disable-line prefer-rest-params
    win.gtag("js", new Date());
    win.gtag("config", GA);
  }
  if (PIXEL && !win.fbq) {
    const n: Fbq = function (...a: unknown[]) { if (n.callMethod) n.callMethod(...a); else n.queue!.push(a); };
    n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    win.fbq = n; win._fbq = win._fbq ?? n;
    n("init", PIXEL);
    n("track", "PageView");
  }
}

const PIXEL_EVENT: Record<string, string> = {
  generate_lead: "Lead",
  contact: "Contact",
  view_item: "ViewContent",
  sign_up: "CompleteRegistration",
};

/** One call sends the event to GA4, the Meta Pixel and the GTM dataLayer. */
export function track(event: string, params: Record<string, unknown> = {}) {
  const win = w();
  if (!win) return;
  try {
    init(win);
    win.dataLayer!.push({ event, ...params });
    win.gtag?.("event", event, params);
    const fb = PIXEL_EVENT[event];
    if (fb && win.fbq) {
      const { listing_no, value, currency, method, form, item_name, item_category } = params as Record<string, string | number | undefined>;
      const eventID = `${event}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; // for Meta dedupe if server events are added later
      win.fbq("track", fb, {
        ...(listing_no ? { content_ids: [listing_no], content_type: "product" } : {}),
        ...(item_name ? { content_name: item_name } : {}),
        ...(item_category || form || method ? { content_category: item_category ?? form ?? method } : {}),
        ...(value != null && currency ? { value, currency } : {}),
      }, { eventID });
    }
  } catch { /* tracking must never break the page */ }
}

const CHANNELS: [RegExp, string][] = [
  [/^https:\/\/(wa\.me|api\.whatsapp\.com)\//i, "whatsapp"],
  [/^tel:/i, "call"],
  [/^mailto:/i, "email"],
];

/** Counts every WhatsApp / call / email tap anywhere on the site, from one place. */
function useContactTaps() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      let method: string | undefined;
      let listing: string | undefined;
      if (href.startsWith("/api/contact") || href.startsWith("/api/wa")) {
        const q = new URL(href, location.origin).searchParams;
        method = q.get("c") ?? "whatsapp";
        listing = q.get("l") ?? undefined;
      } else {
        method = CHANNELS.find(([re]) => re.test(href))?.[1];
      }
      if (!method) return;
      const place = a.closest("[data-track]")?.getAttribute("data-track") ?? (a.classList.contains("wa-float") ? "floating_button" : location.pathname);
      track("contact", { method, ...(listing ? { listing_no: listing } : {}), link_location: place });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
}

export function Analytics() {
  useContactTaps();
  useEffect(() => { const win = w(); if (win) init(win); }, []);
  return (
    <>
      {GTM && (
        <Script id="gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM}');`}</Script>
      )}
      {GA && <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA}`} strategy="afterInteractive" />}
      {PIXEL && <Script src="https://connect.facebook.net/en_US/fbevents.js" strategy="afterInteractive" />}
    </>
  );
}

/** Fires once when a listing page is opened (GA4 view_item, Meta ViewContent). */
export function TrackView(p: { listingNo: string; name: string; category: string; price?: number | null; currency?: string | null }) {
  useEffect(() => {
    track("view_item", {
      listing_no: p.listingNo, item_name: p.name, item_category: p.category,
      ...(p.price && p.currency ? { value: p.price, currency: p.currency } : {}),
      items: [{ item_id: p.listingNo, item_name: p.name, item_category: p.category, ...(p.price ? { price: p.price } : {}) }],
    });
  }, [p.listingNo, p.name, p.category, p.price, p.currency]);
  return null;
}

/** Fires once when a form is sent successfully. */
export function TrackLead({ form, listingNo, event = "generate_lead" }: { form: string; listingNo?: string; event?: string }) {
  useEffect(() => { track(event, { form, ...(listingNo ? { listing_no: listingNo } : {}) }); }, [event, form, listingNo]);
  return null;
}
