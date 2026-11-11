// "WhatsApp about AX…" on the website goes through here: we note the tap (which listing,
// whose WhatsApp, when; nothing about the visitor), nudge the listing agent to log the lead,
// tell the Super Admin, then send the visitor straight on to WhatsApp (Adhith, 11 Nov: option A).
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl, sendEmail } from "@/lib/email";
import { SITE, waLink } from "@/lib/site/listing";

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|headless|lighthouse/i;
const QUIET_MINUTES = 30; // one nudge per listing per half hour, however many taps

export async function GET(request: Request) {
  const url = new URL(request.url);
  const listing = (url.searchParams.get("l") ?? "").toUpperCase();
  const from = (url.searchParams.get("from") ?? "property").slice(0, 40).replace(/[^a-z0-9_-]/gi, "");
  if (!/^AX\d{4,10}$/.test(listing)) return Response.redirect(waLink("Hi Axe Realty, I'd like to know more about your apartments."), 302);

  let number = SITE.whatsapp;
  let text = `I'm interested in ${listing}. Is it still available for a viewing?`;
  try {
    const db = createAdminClient();
    const { data: p } = await db.from("properties")
      .select("id, listing_no, website_published, listing_agent_id, development:developments(name), location:locations(name), agent:agents!properties_listing_agent_id_fkey(id, full_name, status, public_whatsapp, work_email)")
      .eq("listing_no", listing).is("deleted_at", null).maybeSingle();
    if (p) {
      const one = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? x[0] ?? null : x);
      const agent = one(p.agent as never) as { id: string; full_name: string; status: string; public_whatsapp: string | null; work_email: string | null } | null;
      const active = agent?.status === "active" ? agent : null;
      const wa = (active?.public_whatsapp ?? "").replace(/\D/g, "");
      if (wa.length >= 9) number = wa;
      const dev = one(p.development as never) as { name: string } | null, loc = one(p.location as never) as { name: string } | null;
      text = `I'm interested in ${listing} (${dev?.name ?? "apartment"}, ${loc?.name ?? "Colombo"}). Is it still available for a viewing?`;

      if (!BOT.test(request.headers.get("user-agent") ?? "") && p.website_published) {
        const agentId = wa.length >= 9 ? active?.id ?? null : null;
        const since = new Date(Date.now() - QUIET_MINUTES * 60_000).toISOString();
        const { count: recent } = await db.from("whatsapp_clicks").select("id", { count: "exact", head: true }).eq("listing_no", listing).gte("clicked_at", since);
        await db.from("whatsapp_clicks").insert({ property_id: p.id, listing_no: listing, agent_id: agentId, page: from });
        if (!recent) {
          const base = appUrl();
          const where = `${dev?.name ?? "the listing"}${loc ? `, ${loc.name}` : ""}`;
          const { data: admins } = await db.from("agents").select("id").eq("role", "super_admin").eq("status", "active").is("deleted_at", null);
          const notes: { recipient_agent_id: string; kind: string; title: string; body: string; link: string }[] = [];
          if (agentId && active) {
            notes.push({
              recipient_agent_id: agentId, kind: "whatsapp_tap",
              title: `Website visitor tapped WhatsApp on ${listing}`,
              body: `Someone on the website opened WhatsApp to message you about ${listing} (${where}). When they message you, log them as a lead so it's tracked.`,
              link: "/leads/new/",
            });
          }
          for (const a of admins ?? []) {
            if (a.id === agentId) continue;
            notes.push({
              recipient_agent_id: a.id, kind: "whatsapp_tap",
              title: `WhatsApp tap on ${listing}${active && agentId ? ` (to ${active.full_name})` : " (to the company number)"}`,
              body: `From the website ${from} page, ${where}.`, link: `/properties/${listing}/`,
            });
          }
          if (notes.length) await db.from("notifications").insert(notes);
          if (agentId && active?.work_email) {
            await sendEmail({
              to: [active.work_email],
              subject: `Website enquiry on ${listing}: log the lead`,
              text: `Hi ${active.full_name.split(" ")[0]},\n\nSomeone on the Axe Realty website just tapped "WhatsApp" on ${listing} (${where}), so they may be messaging you now.\n\nWhen they do, add them as a lead in the CRM (it takes 30 seconds):\n${base}/leads/new/\n\nAxe Realty`,
            });
          }
        }
      }
    }
  } catch (e) {
    Sentry.captureException(e); // never block the visitor on our bookkeeping
  }
  return new Response(null, { status: 302, headers: { Location: waLink(text, number), "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
