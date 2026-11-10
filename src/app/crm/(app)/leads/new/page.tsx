import { Suspense } from "react";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { LeadForm } from "../lead-form";
import { leadOptions } from "../form-data";

export default function NewLeadPage() {
  return (
    <>
      <div className="page-head"><div><h1>Add lead</h1><p className="muted">A new buyer or tenant. Only the name is required; fill in what you know.</p></div></div>
      <Suspense fallback={<p className="muted">Loading…</p>}><NewLead /></Suspense>
    </>
  );
}

async function NewLead() {
  await connection();
  const user = await requireUser();
  const options = await leadOptions();
  return (
    <LeadForm values={{ looking_for: "rent", lead_source_type: "direct", budget_currency: "USD" }} options={options}
      selected={{ locations: [], developments: [], features: [] }} defaultAgent={user.agentId} cancelHref="/leads" />
  );
}
