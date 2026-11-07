import { Suspense } from "react";
import type { Metadata } from "next";
import { sitePage } from "@/lib/site/data";
import { ReportForm } from "../forms";
import { Copy, Crumbs, SiteHeader } from "../place";

const PATH = "/colombo-apartment-report/";

export async function generateMetadata(): Promise<Metadata> {
  const page = await sitePage(PATH);
  return {
    title: { absolute: `${page?.title || "The Colombo Apartment Report"} — Axe Realty` },
    description: page?.meta_description ?? "What Colombo apartments actually rent for: area-level rental bands from completed lettings, free from Axe Realty.",
    alternates: { canonical: PATH },
  };
}

export default function ReportPage() {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<div style={{ minHeight: 600 }} />}>
        <Report />
      </Suspense>
    </>
  );
}

async function Report() {
  const page = await sitePage(PATH);
  return (
    <>
      <section style={{ background: "var(--ink)", color: "#fff" }}>
        <div className="wrap" style={{ paddingTop: 56, paddingBottom: 56, display: "flex", flexDirection: "column", gap: 14, maxWidth: 900 }}>
          <span className="pill" style={{ background: "var(--red)", alignSelf: "flex-start" }}>The Colombo Apartment Report</span>
          <h1 style={{ color: "#fff", fontSize: "clamp(30px, 4.5vw, 46px)" }}>{page?.h1 || "What can your Colombo apartment actually rent for today?"}</h1>
          {page?.intro && <p style={{ color: "#c9ced8", fontSize: 18, maxWidth: 720 }}>{page.intro}</p>}
        </div>
      </section>
      <Crumbs items={[{ href: "/", label: "Home" }, { label: "Colombo Apartment Report" }]} />
      <section className="wrap section" style={{ display: "flex", flexWrap: "wrap", gap: 48, alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 420px", minWidth: 0 }}><Copy text={page?.body} /></div>
        <div style={{ flex: "1 1 360px", minWidth: 0, background: "var(--section)", borderRadius: 16, padding: 28, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ fontSize: 24 }}>Get the report free</h2>
          <ReportForm />
        </div>
      </section>
    </>
  );
}
