import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { label } from "@/lib/format";
import { offerDate, offerHeading, offerSections, offerText, partiesLine, type OfferKind, type Terms } from "@/lib/offers";
import { OfferActions } from "./offer-actions";

export default function OfferPage({ params }: { params: Promise<{ ref: string }> }) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <Offer params={params} />
    </Suspense>
  );
}

async function Offer({ params }: { params: Promise<{ ref: string }> }) {
  await connection();
  await requireUser();
  const { ref } = await params;
  if (!/^[A-Z0-9-]{4,40}$/i.test(ref)) notFound();
  const supabase = await createClient();
  const { data: o } = await supabase.from("offers").select("*, lead:leads(lead_code, name), property:properties(listing_no)").eq("ref", ref).is("deleted_at", null).maybeSingle();
  if (!o) notFound();
  const kind = (o.deal_type === "sale" ? "sale" : "rental") as OfferKind;
  const terms = (o.terms ?? {}) as Terms;

  return (
    <>
      <nav className="muted" style={{ fontSize: 13 }}><Link href="/leads">Leads</Link> › <Link href={`/leads/${o.lead?.lead_code}`}>{o.lead?.name}</Link> › Offer {o.ref}</nav>
      <div className="page-head no-print">
        <div>
          <h1>Offer {o.ref}</h1>
          <p className="muted">{label(o.status)}{o.sent_at ? ` · sent ${offerDate(o.sent_at.slice(0, 10))}` : ""}{o.property ? <> · <Link href={`/properties/${o.property.listing_no}`}>{o.property.listing_no}</Link></> : null}</p>
        </div>
        <Link className="btn btn-ghost btn-sm" href={`/leads/${o.lead?.lead_code}/offer`}>Revise (new version)</Link>
      </div>
      <OfferActions refNo={o.ref} status={o.status} text={offerText(kind, o.ref, o.issued_on, o.valid_until, terms)} />
      <article className="offer-doc">
        <h2>{offerHeading(kind)}</h2>
        <p className="offer-meta">Offer Ref: <b>{o.ref}</b> · Date issued: {offerDate(o.issued_on)} · Valid until: <b>{offerDate(o.valid_until)}</b></p>
        <p>{partiesLine(kind, terms).map((l, i) => <span key={i}>{l}<br /></span>)}</p>
        {offerSections(kind, terms).map((s) => (
          <section key={s.title}>
            <h3>{s.title}</h3>
            <ul>{s.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </section>
        ))}
        <p className="offer-foot"><b>Subject to contract.</b> This offer sets out the agreed commercial terms only; it is not the tenancy agreement or the Sale &amp; Purchase Agreement. Axe Realty · axerealty.lk</p>
      </article>
    </>
  );
}
