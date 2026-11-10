import { Suspense } from "react";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { today } from "@/lib/crm";
import { ClosingForm } from "../closing-form";
import { closingOptions } from "../form-data";

type SP = Record<string, string | string[] | undefined>;

export default function NewClosingPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <>
      <div className="page-head"><div><h1>Log closing</h1><p className="muted">Pick the lead and property; each side&apos;s agent and sourcing come from them and stay editable.</p></div></div>
      <Suspense fallback={<p className="muted">Loading…</p>}><NewClosing searchParams={searchParams} /></Suspense>
    </>
  );
}

async function NewClosing({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const user = await requireUser();
  if (user.role !== "super_admin") return <p className="muted">Only a Super Admin can log closings.</p>;
  const code = String((await searchParams).lead ?? "").toUpperCase();
  const options = await closingOptions();
  const l = options.leads.find((x) => x.code === code);
  return (
    <ClosingForm options={options} values={{
      closing_date: today(), deal_type: "rental",
      lead: l ? `${l.code} – ${l.label}` : "", lead_side_agent_id: l?.agentId ?? null, lead_sourcing_model: l?.model ?? null,
      lead_side_referral_partner_id: l?.partnerId ?? null,
    }} />
  );
}
