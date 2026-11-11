import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { PartyForm } from "../../party-form";
import { saveDevelopment } from "../actions";
import { developmentFields } from "../fields";

export default function NewDevelopmentPage() {
  return (
    <>
      <nav className="muted" style={{ fontSize: 13 }}><Link href="/developments">Developments</Link> › New</nav>
      <div className="page-head"><div><h1>Add development</h1><p className="muted">Add its towers on the next screen. Its website page is set up separately, once the copy is written.</p></div></div>
      <section className="panel"><Suspense fallback={<p className="muted">Loading…</p>}><Form /></Suspense></section>
    </>
  );
}

async function Form() {
  await connection();
  await requireUser();
  return <PartyForm fields={await developmentFields()} values={{}} action={saveDevelopment} submit="Add development" />;
}
