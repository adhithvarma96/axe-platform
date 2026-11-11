import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { PartyForm } from "../../party-form";
import { saveLocation } from "../actions";
import { locationFields } from "../fields";

export default function NewLocationPage() {
  return (
    <>
      <nav className="muted" style={{ fontSize: 13 }}><Link href="/locations">Locations</Link> › New</nav>
      <div className="page-head"><div><h1>Add location</h1><p className="muted">An area properties and developments can belong to. Its website page is set up separately, once the copy is written.</p></div></div>
      <section className="panel"><Suspense fallback={<p className="muted">Loading…</p>}><Form /></Suspense></section>
    </>
  );
}

async function Form() {
  await connection();
  await requireUser();
  return <PartyForm fields={await locationFields()} values={{}} action={saveLocation} submit="Add location" />;
}
