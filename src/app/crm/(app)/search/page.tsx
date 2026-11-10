import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { label } from "@/lib/format";
import { stageLabel } from "@/lib/crm";

type SP = Record<string, string | string[] | undefined>;

export default function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <Suspense fallback={<p className="muted">Searching…</p>}>
      <Results searchParams={searchParams} />
    </Suspense>
  );
}

type Hit = { href: string; title: string; sub: string };

/** Global search (9): listing no, lead ID, names, phones, emails, development. */
async function Results({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const user = await requireUser();
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? "").trim().replace(/[,()%*]/g, " ").slice(0, 80);
  const digits = q.replace(/\D/g, "");
  // Phones are stored in many shapes; match on the last 7 digits when the query looks like a number.
  const phone = digits.length >= 6 ? digits.slice(-7) : null;
  const like = `%${q}%`;
  const supabase = await createClient();

  let groups: { title: string; hits: Hit[] }[] = [];
  if (q.length >= 2) {
    const or = (cols: string[], phoneCols: string[] = []) =>
      [...cols.map((c) => `${c}.ilike.${like}`), ...(phone ? phoneCols.map((c) => `${c}.ilike.%${phone}%`) : [])].join(",");
    const [leads, props, owners, devs, mkt, ext, refp] = await Promise.all([
      supabase.from("leads").select("lead_code, name, pipeline_status, phone").is("deleted_at", null).or(or(["lead_code", "name", "email", "phone", "company"], ["phone"])).limit(15),
      supabase.from("properties").select("listing_no, status, beds, development:developments(name)").is("deleted_at", null).or(or(["listing_no", "unit_number"])).limit(15),
      supabase.from("owners").select("id, name, primary_phone").is("deleted_at", null).or(or(["name", "email", "primary_phone", "whatsapp"], ["primary_phone", "whatsapp"])).limit(15),
      supabase.from("developments").select("id, name").is("deleted_at", null).ilike("name", like).limit(10),
      supabase.from("marketing_leads").select("id, name, email, status").is("deleted_at", null).or(or(["name", "email", "whatsapp"], ["whatsapp"])).limit(10),
      supabase.from("external_agents").select("id, agent_name, company").is("deleted_at", null).or(or(["agent_name", "company", "phone", "whatsapp", "email"], ["phone", "whatsapp"])).limit(10),
      supabase.from("referral_partners").select("id, full_name, company_organization").is("deleted_at", null).or(or(["full_name", "company_organization", "phone", "email"], ["phone"])).limit(10),
    ]);
    // Properties in a matching development, too ("Cinnamon Life" finds its units).
    const devIds = (devs.data ?? []).map((d) => d.id);
    const inDev = devIds.length
      ? await supabase.from("properties").select("listing_no, status, beds, development:developments(name)").is("deleted_at", null).in("development_id", devIds).order("listing_no", { ascending: false }).limit(20)
      : { data: [] };
    const propRows = [...(props.data ?? []), ...(inDev.data ?? []).filter((p) => !(props.data ?? []).some((x) => x.listing_no === p.listing_no))];

    groups = [
      { title: "Leads", hits: (leads.data ?? []).map((l) => ({ href: `/leads/${l.lead_code}`, title: l.name, sub: `${l.lead_code} · ${stageLabel(l.pipeline_status)}` })) },
      { title: "Properties", hits: propRows.map((p) => ({ href: `/properties/${p.listing_no}`, title: p.listing_no ?? "", sub: [p.development?.name, p.beds != null ? `${p.beds} bed` : null, label(p.status)].filter(Boolean).join(" · ") })) },
      { title: "Owners", hits: (owners.data ?? []).map((o) => ({ href: `/owners/${o.id}`, title: o.name, sub: o.primary_phone ?? "" })) },
      { title: "Developments", hits: (devs.data ?? []).map((d) => ({ href: `/developments/${d.id}`, title: d.name, sub: "" })) },
      { title: "Marketing leads", hits: (mkt.data ?? []).map((m) => ({ href: `/marketing-leads/${m.id}`, title: m.name || m.email || "", sub: label(m.status) })) },
      { title: "External agents", hits: (ext.data ?? []).map((a) => ({ href: `/external-agents/${a.id}`, title: a.agent_name, sub: a.company ?? "" })) },
      { title: "Referral partners", hits: (refp.data ?? []).map((p) => ({ href: `/referral-partners/${p.id}`, title: p.full_name, sub: p.company_organization ?? "" })) },
    ].filter((g) => g.hits.length);
    if (user.role === "data_entry") groups = groups.filter((g) => g.title !== "Marketing leads");
  }
  const total = groups.reduce((s, g) => s + g.hits.length, 0);

  return (
    <>
      <div className="page-head"><div><h1>Search</h1>{q && <p className="muted">{total ? `${total} results for “${q}”` : `Nothing found for “${q}”`}</p>}</div></div>
      <form className="panel filters" action="/search" role="search">
        <div className="field" style={{ flex: "1 1 320px" }}>
          <label htmlFor="sq">Search everything</label>
          <input id="sq" name="q" defaultValue={q} autoFocus placeholder="Listing no, lead ID, name, phone, email, building" />
        </div>
        <button className="btn" type="submit">Search</button>
      </form>
      {q.length === 1 && <p className="muted">Type at least two characters.</p>}
      <div className="grid-2">
        {groups.map((g) => (
          <section key={g.title} className="panel">
            <h2 className="section-title">{g.title} ({g.hits.length})</h2>
            <ul className="mini-list">
              {g.hits.map((h) => <li key={h.href}><Link href={h.href}>{h.title}</Link><span className="muted">{h.sub}</span></li>)}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
