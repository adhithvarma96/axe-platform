import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PartyForm } from "../../../party-form";
import { saveDevelopment } from "../../actions";
import { developmentFields } from "../../fields";

export default function EditDevelopmentPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<p className="muted">Loading…</p>}><Edit params={params} /></Suspense>;
}

async function Edit({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: d } = await supabase.from("developments")
    .select("id, name, location_id, developer_builder, development_status, year_completed, total_units, towers_blocks, notes")
    .eq("id", id).is("deleted_at", null).maybeSingle();
  if (!d) notFound();
  return (
    <>
      <nav className="muted" style={{ fontSize: 13 }}><Link href="/developments">Developments</Link> › <Link href={`/developments/${d.id}`}>{d.name}</Link> › Edit</nav>
      <div className="page-head"><h1>Edit {d.name}</h1></div>
      <section className="panel"><PartyForm fields={await developmentFields()} values={d} action={saveDevelopment} submit="Save development" /></section>
    </>
  );
}
