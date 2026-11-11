import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { label } from "@/lib/format";
import { WebsiteImage } from "../../website-image";
import { ClosingHistory } from "../../closings/history";
import { AdminDelete } from "../../bin/admin-delete";
import { ScopedProperties } from "../../properties/scoped-list";

type SP = Record<string, string | string[] | undefined>;

export default function LocationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <Location params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Location({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  await connection();
  await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: l } = await supabase
    .from("locations")
    .select("id, name, postal_code, market_tier, slug, website_image, province:provinces(name), developments(id, name)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!l) notFound();
  const sp = await searchParams;
  return (
    <>
      <nav className="muted" style={{ fontSize: 13 }}><Link href="/locations">Locations</Link> › {l.name}</nav>
      <div className="page-head"><h1>{l.name}</h1><AdminDelete table="locations" id={l.id} what={l.name} /></div>
      <div className="grid-2">
        <section className="panel">
          <h2 className="section-title">Details</h2>
          <dl className="facts">
            <dt>Province</dt><dd>{l.province?.name ?? "—"}</dd>
            <dt>Postal code</dt><dd>{l.postal_code ?? "—"}</dd>
            <dt>Market tier</dt><dd>{label(l.market_tier)}</dd>
            <dt>Website page</dt><dd>{l.slug ? `/location/${l.slug}/` : "Not set up"}</dd>
          </dl>
        </section>
        <section className="panel">
          <h2 className="section-title">Website image</h2>
          <WebsiteImage kind="location" id={l.id} image={l.website_image} ideal="tile"
            hint="A landmark or street scene of this area. Used on its tile on the home page and in search." />
        </section>
      </div>
      <section className="panel">
        <h2 className="section-title">Developments ({l.developments?.length ?? 0})</h2>
        {l.developments?.length ? (
          <p>{l.developments.sort((a, b) => a.name.localeCompare(b.name)).map((d, i) => (
            <span key={d.id}>{i > 0 && " · "}<Link href={`/developments/${d.id}`}>{d.name}</Link></span>
          ))}</p>
        ) : <p className="muted">None recorded.</p>}
      </section>
      <ScopedProperties col="location_id" id={l.id} sp={sp} path={`/locations/${l.id}`} showDevelopment />
      <ClosingHistory by="location" id={l.id} />
    </>
  );
}
