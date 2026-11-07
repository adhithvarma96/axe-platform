import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { developments } from "@/lib/site/data";
import { OwnerForm } from "../forms";
import { Banner, Crumbs, SiteHeader } from "../place";

export const metadata: Metadata = {
  title: "List Your Apartment with Axe Realty",
  description: "List your Colombo apartment with Axe Realty: professional marketing, priced from real transactions in your building, matched against live buyer and tenant demand. Free assessment.",
  alternates: { canonical: "/list-your-property/" },
};

const WHY = [
  "Priced from live transactions in your building",
  "Professional photos and a dedicated listing page",
  "Matched against our live buyer and tenant requirements",
  "Discreet: your name and unit number are never published",
];
const STEPS = [
  ["Visit & assessment", "We view the apartment and agree a price based on what similar units in your building actually achieve."],
  ["Marketing", "Photos, a listing page, our buyer and tenant network, and co-broking with partner agencies."],
  ["Offer to keys", "Written offers, agreed terms, draft agreement and handover, all on one checklist."],
];

export default function ListYourPropertyPage() {
  return (
    <>
      <SiteHeader />
      <Banner eyebrow="For apartment owners" h1="List Your Apartment with Axe Realty" />
      <Crumbs items={[{ href: "/", label: "Home" }, { label: "List Your Property" }]} />
      <section className="wrap section" style={{ display: "flex", flexWrap: "wrap", gap: 48, alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 340px", minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          <h2 style={{ fontSize: 30 }}>Why owners list with us</h2>
          <p>We only do Colombo apartments, so your unit is shown to buyers and tenants already looking in your building and your area. Professional marketing, strategic exposure and serious leads: we handle everything, from pricing to paperwork.</p>
          <ul className="copy-list">{WHY.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
        <div style={{ flex: "1 1 480px", minWidth: 0, background: "var(--section)", borderRadius: 16, padding: 28, boxSizing: "border-box" }}>
          <Suspense fallback={null}><Form /></Suspense>
        </div>
      </section>
      <section className="section section-alt">
        <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <h2 className="h2" style={{ textAlign: "center" }}>How it works</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", gap: 20 }}>
            {STEPS.map(([t, d], i) => (
              <div key={t} style={{ background: "#fff", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ width: 40, height: 40, borderRadius: 10, background: "var(--red)", color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-heading)", fontWeight: 700 }}>{i + 1}</span>
                <h3 style={{ fontSize: 20 }}>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="wrap" style={{ paddingTop: 64, paddingBottom: 72 }}>
        <div style={{ background: "var(--ink)", borderRadius: 16, padding: 40, display: "flex", gap: 24, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 420px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ fontSize: 28, color: "#fff" }}>The Colombo Apartment Report</h2>
            <p style={{ color: "#c9ced8" }}>Our periodic read on the Colombo apartment market for owners and investors. Free to download.</p>
          </div>
          <Link className="s-btn" href="/colombo-apartment-report/">Get the report</Link>
        </div>
      </section>
    </>
  );
}

async function Form() {
  const devs = (await developments()).map((d) => d.name ?? "").filter(Boolean);
  return <OwnerForm developments={devs} />;
}
