import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { PartyForm } from "../../party-form";
import { saveReferralPartner } from "../actions";
import { referralPartnerFields } from "../fields";

export default function NewReferralPartnerPage() {
  return (
    <>
      <nav className="muted" style={{ fontSize: 13 }}><Link href="/referral-partners">Referral partners</Link> › New</nav>
      <div className="page-head"><h1>Add referral partner</h1></div>
      <section className="panel"><Suspense fallback={<p className="muted">Loading…</p>}><Form /></Suspense></section>
    </>
  );
}

async function Form() {
  await connection();
  const user = await requireUser();
  return <PartyForm fields={await referralPartnerFields(user.role === "super_admin")} values={{ referral_rate_pct: 15, attributed_to_agent_id: user.agentId }} action={saveReferralPartner} submit="Add partner" />;
}
