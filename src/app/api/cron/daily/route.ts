import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl, sendEmail } from "@/lib/email";
import { addDays, needsFollowUp, today } from "@/lib/crm";

// Runs every morning at 08:00 Colombo (02:30 UTC, vercel.json):
//   1. each agent gets their follow-ups (viewings pending 2+ days, tasks due) in the
//      inbox and by email, skipped on their day off (SPEC 7.6, 13)
//   2. Adhith hears about referral agreements expiring in 30 days (13)
// Safe to run twice: an agent's digest is sent at most once a day.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  // The public website deployment shares this code but must never email the team.
  if (process.env.APP_SURFACE === "site") return Response.json({ ok: true, skipped: "site" });

  try {
    const db = createAdminClient();
    const on = today();
    const weekday = new Date(`${on}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" }).toLowerCase();
    const startOfDay = new Date(`${on}T00:00:00+05:30`).toISOString();

    const [agentsQ, viewingsQ, tasksQ, sentQ] = await Promise.all([
      db.from("agents").select("id, full_name, work_email, role, weekly_day_off").eq("status", "active").is("deleted_at", null),
      db.from("viewings").select("viewing_no, date, outcome, last_follow_up, conducted_by_agent_id, lead:leads(name), property:properties(listing_no)").is("deleted_at", null).eq("outcome", "pending").lte("date", on),
      db.from("tasks").select("title, due_on, assignee_agent_id, lead:leads(lead_code, name)").eq("status", "open").is("deleted_at", null).lte("due_on", on),
      db.from("notifications").select("recipient_agent_id").eq("kind", "follow_up_digest").gte("created_at", startOfDay),
    ]);
    for (const q of [agentsQ, viewingsQ, tasksQ, sentQ]) if (q.error) throw q.error;
    const already = new Set((sentQ.data ?? []).map((n) => n.recipient_agent_id));
    const base = appUrl();
    // The service client is untyped: embedded rows come back as objects at runtime.
    type One<T> = T | T[] | null;
    const first = <T,>(x: One<T>): T | null => (Array.isArray(x) ? x[0] ?? null : x);
    let sent = 0;

    for (const a of agentsQ.data ?? []) {
      if (already.has(a.id) || a.weekly_day_off === weekday) continue;
      const views = (viewingsQ.data ?? []).filter((v) => v.conducted_by_agent_id === a.id && needsFollowUp(v, on));
      const tasks = (tasksQ.data ?? []).filter((t) => t.assignee_agent_id === a.id);
      if (!views.length && !tasks.length) continue;

      const lines = [
        ...views.map((v) => `• Viewing ${v.viewing_no}: ${first<{ name: string }>(v.lead)?.name ?? "sourcing visit"} at ${first<{ listing_no: string }>(v.property)?.listing_no ?? "?"} (${v.date}) — ${base}/viewings/${v.viewing_no}/`),
        ...tasks.map((t) => { const l = first<{ lead_code: string; name: string }>(t.lead); return `• ${t.title}${l ? ` — ${l.name}` : ""} (due ${t.due_on}) — ${l ? `${base}/leads/${l.lead_code}/` : `${base}/dashboard/`}`; }),
      ];
      const title = `${views.length + tasks.length} follow-up${views.length + tasks.length === 1 ? "" : "s"} for today`;
      const { data: note, error } = await db.from("notifications").insert({
        recipient_agent_id: a.id, kind: "follow_up_digest", title,
        body: lines.map((l) => l.replace(/ — https?:\S+$/, "")).join("\n"), link: "/viewings/", email_status: a.work_email ? "queued" : null,
      }).select("id").single();
      if (error) throw error;
      if (a.work_email) {
        const ok = await sendEmail({
          to: [a.work_email],
          subject: `Axe Realty: ${title}`,
          text: `Good morning ${a.full_name.split(" ")[0]},\n\nThese need a follow-up today:\n\n${lines.join("\n")}\n\nUpdate the outcome or the last follow-up date in the CRM and they drop off this list.\n\n${base}/dashboard/`,
        });
        await db.from("notifications").update({ email_status: ok ? "sent" : "failed", email_sent_at: ok ? new Date().toISOString() : null }).eq("id", note.id);
      }
      sent++;
    }

    // Referral agreements expiring in exactly 30 days -> every Super Admin.
    const { data: expiring } = await db.from("referral_partners").select("id, full_name, agreement_valid_until").is("deleted_at", null).eq("agreement_valid_until", addDays(on, 30));
    const admins = (agentsQ.data ?? []).filter((a) => a.role === "super_admin");
    for (const p of expiring ?? []) {
      for (const ad of admins) {
        await db.from("notifications").insert({ recipient_agent_id: ad.id, kind: "agreement_expiring", title: `Referral agreement expires in 30 days: ${p.full_name}`, body: `Valid until ${p.agreement_valid_until}.`, link: `/referral-partners/${p.id}/` });
      }
      if (admins.some((x) => x.work_email)) {
        await sendEmail({ to: admins.map((x) => x.work_email!).filter(Boolean), subject: `Referral agreement expiring: ${p.full_name}`, text: `${p.full_name}'s referral agreement is valid until ${p.agreement_valid_until}.\n\n${base}/referral-partners/${p.id}/` });
      }
    }

    return Response.json({ ok: true, digests: sent, expiring: expiring?.length ?? 0 });
  } catch (e) {
    Sentry.captureException(e);
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
