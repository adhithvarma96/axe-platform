import "server-only";
// When a property goes on the website, run property -> leads matching straight away and tell the
// agent of each matched lead (and the Super Admin, for owner-buyers and unassigned leads).
// Adhith, 13 Nov 2026: run automatically on publish. Uses the service key: it runs after the
// response, outside the user's request, and only reads/writes match results and notifications.
import { createAdminClient } from "@/lib/supabase/admin";
import { matchProperty } from "@/lib/matching";

export async function matchOnPublish(propertyId: string): Promise<void> {
  const db = createAdminClient();
  const out = await matchProperty(db, propertyId);
  if (!out.runId || !out.count) return;
  const [{ data: rows }, { data: p }, { data: admins }] = await Promise.all([
    db.from("match_results").select("matched_table, matched_id, reason").eq("run_id", out.runId).order("rank"),
    db.from("properties").select("listing_no, development:developments(name)").eq("id", propertyId).maybeSingle(),
    db.from("agents").select("id").eq("role", "super_admin").eq("status", "active").is("deleted_at", null),
  ]);
  const leadIds = (rows ?? []).filter((r) => r.matched_table === "leads").map((r) => r.matched_id);
  const { data: leads } = leadIds.length ? await db.from("leads").select("id, lead_code, name, assigned_agent_id").in("id", leadIds) : { data: [] };
  const dev = (Array.isArray(p?.development) ? p?.development[0] : p?.development) as { name: string } | null | undefined;
  const what = `${p?.listing_no ?? "A new listing"}${dev?.name ? ` (${dev.name})` : ""}`;
  const notes: { recipient_agent_id: string; kind: string; title: string; body: string; link: string }[] = [];
  const adminIds = (admins ?? []).map((a) => a.id);
  for (const r of rows ?? []) {
    if (r.matched_table === "leads") {
      const l = (leads ?? []).find((x) => x.id === r.matched_id);
      if (!l) continue;
      for (const to of l.assigned_agent_id ? [l.assigned_agent_id] : adminIds) {
        notes.push({ recipient_agent_id: to, kind: "match_on_publish", title: `${what} matches your lead ${l.name}`, body: r.reason ?? "", link: `/leads/${l.lead_code}/` });
      }
    } else if (r.matched_table === "owners") {
      for (const to of adminIds) notes.push({ recipient_agent_id: to, kind: "match_on_publish", title: `${what} matches an owner-buyer`, body: r.reason ?? "", link: `/owners/${r.matched_id}/` });
    }
  }
  if (notes.length) await db.from("notifications").insert(notes);
}
