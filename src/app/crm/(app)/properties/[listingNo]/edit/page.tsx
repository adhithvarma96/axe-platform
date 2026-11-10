import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadFormOptions } from "../../form-data";
import { PropertyForm } from "../../property-form";

export default function EditPropertyPage({ params }: { params: Promise<{ listingNo: string }> }) {
  return (
    <Suspense fallback={<p className="muted">Loading form…</p>}>
      <EditForm params={params} />
    </Suspense>
  );
}

async function EditForm({ params }: { params: Promise<{ listingNo: string }> }) {
  await connection();
  const user = await requireUser();
  const { listingNo } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("properties")
    .select("*, features:property_feature_links(feature_id), source_agents:property_source_external_agents(external_agent_id)")
    .eq("listing_no", decodeURIComponent(listingNo).toUpperCase())
    .is("deleted_at", null)
    .maybeSingle();
  if (!p) notFound();
  const options = await loadFormOptions();
  return (
    <>
      <nav className="muted" style={{ fontSize: 13 }}>
        <Link href="/properties">Properties</Link> › <Link href={`/properties/${p.listing_no}`}>{p.listing_no}</Link> › Edit
      </nav>
      <div className="page-head"><h1>Edit {p.listing_no}</h1></div>
      <PropertyForm
        values={{ ...(p as unknown as Record<string, unknown>), source_agent_ids: (p.source_agents ?? []).map((s) => s.external_agent_id) }}
        options={options}
        featureIds={(p.features ?? []).map((f) => f.feature_id)}
        isAdmin={user.role === "super_admin"}
        cancelHref={`/properties/${p.listing_no}`}
      />
    </>
  );
}
