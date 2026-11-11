import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/format";
import { CopyShare, FindMatches } from "./find-button";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://axerealty.lk").replace(/\/$/, "");
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" });

/** The latest AI matches for a lead (properties) or a property (leads and owner-buyers). */
export async function MatchesPanel({ kind, id, leadName, leadPhone }: { kind: "lead" | "property"; id: string; leadName?: string; leadPhone?: string | null }) {
  const supabase = await createClient();
  const { data: latest } = await supabase.from("match_results").select("run_id, created_at, model, run_note")
    .eq("source_table", kind === "lead" ? "leads" : "properties").eq("source_id", id).is("deleted_at", null)
    .order("created_at", { ascending: false }).limit(1);
  const run = latest?.[0];
  const { data: rows } = run
    ? await supabase.from("match_results").select("matched_table, matched_id, rank, reason").eq("run_id", run.run_id).order("rank")
    : { data: [] as { matched_table: string; matched_id: string; rank: number; reason: string | null }[] };
  const ids = (t: string) => (rows ?? []).filter((r) => r.matched_table === t).map((r) => r.matched_id);
  const [props, leads, owners] = await Promise.all([
    ids("properties").length ? supabase.from("properties").select("id, listing_no, beds, asking_rent, rent_currency, asking_sale_price, sale_currency, status, website_published, development:developments(name), location:locations(name)").in("id", ids("properties")) : { data: [] },
    ids("leads").length ? supabase.from("leads").select("id, lead_code, name, pipeline_status, agent:agents!leads_assigned_agent_id_fkey(full_name)").in("id", ids("leads")) : { data: [] },
    ids("owners").length ? supabase.from("owners").select("id, name, primary_phone").in("id", ids("owners")) : { data: [] },
  ]);
  const nos = (props.data ?? []).filter((p) => p.website_published).map((p) => p.listing_no!).filter(Boolean);
  const { data: web } = nos.length ? await supabase.from("web_listings").select("listing_no, slug").in("listing_no", nos) : { data: [] as { listing_no: string | null; slug: string | null }[] };
  const webUrl = (no: string | null) => { const w = (web ?? []).find((x) => x.listing_no === no); return w?.slug ? `${SITE}/property/${w.slug}/` : null; };

  const items = (rows ?? []).map((r) => {
    if (r.matched_table === "properties") {
      const p = (props.data ?? []).find((x) => x.id === r.matched_id);
      if (!p) return null;
      const price = [p.asking_rent != null ? `${money(p.asking_rent, p.rent_currency)}/mo` : null, p.asking_sale_price != null ? money(p.asking_sale_price, p.sale_currency) : null].filter(Boolean).join(" · ");
      return { key: r.matched_id, href: `/properties/${p.listing_no}`, title: `${p.listing_no} · ${p.development?.name ?? p.location?.name ?? "Property"}${p.beds != null ? ` · ${p.beds} bed` : ""}`, sub: [price, p.status !== "available" ? `now ${p.status}` : null].filter(Boolean).join(" · "), reason: r.reason, share: `• ${p.development?.name ?? "Apartment"}${p.location?.name ? `, ${p.location.name}` : ""}${p.beds != null ? `, ${p.beds} bed` : ""}${price ? `, ${price}` : ""} (Ref ${p.listing_no})${webUrl(p.listing_no) ? `\n  ${webUrl(p.listing_no)}` : ""}` };
    }
    if (r.matched_table === "leads") {
      const l = (leads.data ?? []).find((x) => x.id === r.matched_id);
      if (!l) return null;
      return { key: r.matched_id, href: `/leads/${l.lead_code}`, title: `${l.name} · ${l.lead_code}`, sub: `Lead · ${l.agent?.full_name ?? "unassigned"}`, reason: r.reason, share: "" };
    }
    const o = (owners.data ?? []).find((x) => x.id === r.matched_id);
    if (!o) return null;
    return { key: r.matched_id, href: `/owners/${o.id}`, title: o.name, sub: "Owner-buyer", reason: r.reason, share: "" };
  }).filter((x): x is NonNullable<typeof x> => !!x);

  const shareText = kind === "lead" && items.length
    ? `Hi ${(leadName ?? "").split(" ")[0] || "there"}, here are some apartments that match what you're looking for:\n\n${items.map((i) => i.share).join("\n\n")}\n\nLet me know which ones you'd like to view.`
    : "";

  return (
    <section className="panel" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <h2 className="section-title" style={{ margin: 0 }}>AI matches</h2>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
            {run ? `Last run ${when(run.created_at)}${run.model === "rules" ? " (rules only; AI ranking is off)" : ""}` : kind === "lead" ? "Up to 5 available listings that fit this lead." : "Up to 5 active leads and owner-buyers for this listing."}
          </p>
        </div>
        <FindMatches kind={kind} id={id} again={!!run} />
      </div>
      {run?.run_note && <p className="protocol" style={{ margin: 0 }}>{run.run_note}</p>}
      {items.length > 0 && (
        <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((i) => (
            <li key={i.key}>
              <Link href={i.href} style={{ fontWeight: 700 }}>{i.title}</Link>
              {i.sub && <span className="muted" style={{ fontSize: 13 }}> · {i.sub}</span>}
              {i.reason && <div style={{ fontSize: 14 }}>{i.reason}</div>}
            </li>
          ))}
        </ol>
      )}
      {shareText && <CopyShare text={shareText} phone={leadPhone ?? null} />}
    </section>
  );
}
