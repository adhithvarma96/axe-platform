import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PartyForm } from "../../../party-form";
import { saveOwner } from "../../actions";
import { OWNER_FIELDS } from "../../fields";

export default function EditOwnerPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<p className="muted">Loading…</p>}><Edit params={params} /></Suspense>;
}

async function Edit({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: o } = await supabase.from("owners").select("id, name, owner_type, primary_phone, whatsapp, email, contact_protocol, mandate_status, contact_notes, address, notes").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!o) notFound();
  return (
    <>
      <nav className="muted" style={{ fontSize: 13 }}><Link href="/owners">Owners</Link> › <Link href={`/owners/${o.id}`}>{o.name}</Link> › Edit</nav>
      <div className="page-head"><h1>Edit {o.name}</h1></div>
      <section className="panel"><PartyForm fields={OWNER_FIELDS} values={o} action={saveOwner} submit="Save owner" duplicateHref="/owners/" /></section>
    </>
  );
}
