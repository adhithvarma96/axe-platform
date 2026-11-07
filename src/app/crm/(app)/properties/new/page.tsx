import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { loadFormOptions } from "../form-data";
import { PropertyForm } from "../property-form";

export default function NewPropertyPage() {
  return (
    <>
      <nav className="muted" style={{ fontSize: 13 }}><Link href="/properties">Properties</Link> › New</nav>
      <div className="page-head"><h1>Add a property</h1></div>
      <Suspense fallback={<p className="muted">Loading form…</p>}>
        <NewForm />
      </Suspense>
    </>
  );
}

async function NewForm() {
  await connection();
  const user = await requireUser();
  const options = await loadFormOptions();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <p className="muted">The listing number (e.g. AX26…) is created automatically when you save. Add photos on the next screen.</p>
      <PropertyForm
        values={{ property_type: "apartment", status: "available", listing_date: today, listing_agent_id: user.agentId }}
        options={options}
        featureIds={[]}
        isAdmin={user.role === "super_admin"}
        cancelHref="/properties"
      />
    </>
  );
}
