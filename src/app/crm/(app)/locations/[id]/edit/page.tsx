import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PartyForm } from "../../../party-form";
import { saveLocation } from "../../actions";
import { locationFields } from "../../fields";

export default function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<p className="muted">Loading…</p>}><Edit params={params} /></Suspense>;
}

async function Edit({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: l } = await supabase.from("locations").select("id, name, province_id, postal_code, market_tier, notes").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!l) notFound();
  return (
    <>
      <nav className="muted" style={{ fontSize: 13 }}><Link href="/locations">Locations</Link> › <Link href={`/locations/${l.id}`}>{l.name}</Link> › Edit</nav>
      <div className="page-head"><h1>Edit {l.name}</h1></div>
      <section className="panel"><PartyForm fields={await locationFields()} values={l} action={saveLocation} submit="Save location" /></section>
    </>
  );
}
