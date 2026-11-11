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

export default function DevelopmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <Development params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Development({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  await connection();
  await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: d } = await supabase
    .from("developments")
    .select(`*, location:locations(name), towers:development_towers(id, name)`)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!d) notFound();
  const sp = await searchParams;
  const facts: [string, React.ReactNode][] = [
    ["Location", d.location?.name], ["Developer", d.developer_builder], ["Status", label(d.development_status)],
    ["Completed", d.year_completed], ["Total units", d.total_units], ["Towers / blocks", d.towers_blocks],
    ["Website address", d.slug ? `/development/${d.slug}/` : "Not set up yet"],
  ];

  return (
    <>
      <nav className="muted" style={{ fontSize: 13 }}><Link href="/developments">Developments</Link> › {d.name}</nav>
      <div className="page-head"><h1>{d.name}</h1><AdminDelete table="developments" id={d.id} what={d.name} /></div>
      <div className="grid-2">
        <section className="panel">
          <h2 className="section-title">Details</h2>
          <dl className="facts">{facts.filter(([, v]) => v).map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          {d.notes && <p style={{ marginTop: 12, whiteSpace: "pre-line" }}>{d.notes}</p>}
        </section>
        <section className="panel">
          <h2 className="section-title">Website image</h2>
          <WebsiteImage kind="development" id={d.id} image={d.website_image} ideal="tile"
            hint="A photo of the building itself. Used on its tile on the home page and hub." />
        </section>
        <section className="panel">
          <h2 className="section-title">Towers ({d.towers?.length ?? 0})</h2>
          {d.towers?.length ? <p>{d.towers.map((t) => t.name).sort().join(" · ")}</p> : <p className="muted">No towers recorded.</p>}
        </section>
      </div>
      <ScopedProperties col="development_id" id={d.id} sp={sp} path={`/developments/${d.id}`} />
      <ClosingHistory by="development" id={id} />
    </>
  );
}
