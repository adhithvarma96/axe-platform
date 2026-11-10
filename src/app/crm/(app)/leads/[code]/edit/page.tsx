import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LeadForm } from "../../lead-form";
import { leadOptions } from "../../form-data";

export default function EditLeadPage({ params }: { params: Promise<{ code: string }> }) {
  return <Suspense fallback={<p className="muted">Loading…</p>}><EditLead params={params} /></Suspense>;
}

async function EditLead({ params }: { params: Promise<{ code: string }> }) {
  await connection();
  const user = await requireUser();
  const { code } = await params;
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("*").ilike("lead_code", code).is("deleted_at", null).maybeSingle();
  if (!lead) notFound();
  const [options, locs, devs, feats] = await Promise.all([
    leadOptions(),
    supabase.from("lead_preferred_locations").select("location_id").eq("lead_id", lead.id),
    supabase.from("lead_preferred_developments").select("development_id").eq("lead_id", lead.id),
    supabase.from("lead_features_wanted").select("feature_id").eq("lead_id", lead.id),
  ]);
  return (
    <>
      <div className="page-head"><div><h1>Edit {lead.name}</h1><p className="muted">{lead.lead_code}. Stage changes happen on the lead page, through the gates.</p></div></div>
      <LeadForm values={lead as Record<string, unknown>} options={options} defaultAgent={user.agentId} cancelHref={`/leads/${lead.lead_code}`}
        selected={{
          locations: (locs.data ?? []).map((x) => x.location_id),
          developments: (devs.data ?? []).map((x) => x.development_id),
          features: (feats.data ?? []).map((x) => x.feature_id),
        }} />
    </>
  );
}
