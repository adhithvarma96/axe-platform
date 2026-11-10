import { Suspense } from "react";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { today } from "@/lib/crm";
import { ViewingForm } from "../viewing-form";
import { viewingOptions } from "../form-data";

type SP = Record<string, string | string[] | undefined>;

export default function NewViewingPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <>
      <div className="page-head"><div><h1>Log viewing</h1><p className="muted">Before or after it happens. The lead&apos;s stage follows the outcome.</p></div></div>
      <Suspense fallback={<p className="muted">Loading…</p>}><NewViewing searchParams={searchParams} /></Suspense>
    </>
  );
}

async function NewViewing({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const user = await requireUser();
  const sp = await searchParams;
  const leadCode = typeof sp.lead === "string" ? sp.lead : "";
  const listingNo = typeof sp.property === "string" ? sp.property : "";
  const options = await viewingOptions();
  const supabase = await createClient();
  const lead = leadCode ? (await supabase.from("leads").select("lead_code, name").ilike("lead_code", leadCode).maybeSingle()).data : null;
  const prop = options.properties.find((p) => p.no.toLowerCase() === listingNo.toLowerCase());
  return (
    <ViewingForm
      options={options}
      cancelHref={lead ? `/leads/${lead.lead_code}` : "/viewings"}
      values={{
        date: today(), outcome: "pending", conducted_by_agent_id: user.agentId, viewing_model: "our_lead_our_property",
        lead: lead ? `${lead.lead_code} – ${lead.name}` : "", property: prop ? `${prop.no} – ${prop.label}` : "",
      }}
    />
  );
}
