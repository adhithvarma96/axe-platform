import "server-only";
// The Call, Email and WhatsApp buttons on a website listing all go through here. We note the
// tap (which listing, which button, whose contact, when), tell the listing agent to log the lead
// and tell the Super Admin, then send the visitor straight on to their phone, mail or WhatsApp app.
// Adhith, 11-13 Nov: notify on every tap; the same visitor tapping the same button on the same
// listing within 10 minutes counts once. A visitor is recognised by a random browser cookie that
// holds nothing personal; no IP, phone or name is stored.
import * as Sentry from "@sentry/nextjs";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl, sendEmail } from "@/lib/email";
import { SITE, waLink } from "@/lib/site/listing";

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|headless|lighthouse/i;
const REPEAT_MINUTES = 10;
const COOKIE = "axe_v";
export type Channel = "whatsapp" | "call" | "email";
const VERB: Record<Channel, string> = { whatsapp: "WhatsApp", call: "Call", email: "Email" };

export async function handleTap(request: Request, rawChannel: Channel) {
  const url = new URL(request.url);
  const channel: Channel = (["whatsapp", "call", "email"] as const).includes(rawChannel) ? rawChannel : "whatsapp";
  const listing = (url.searchParams.get("l") ?? "").toUpperCase();
  const from = (url.searchParams.get("from") ?? "property").slice(0, 40).replace(/[^a-z0-9_-]/gi, "");

  let phone = SITE.whatsapp;
  let email = SITE.email;
  let text = `I'm interested in ${listing}. Is it still available for a viewing?`;
  const jar = await cookies();
  let visitor = jar.get(COOKIE)?.value ?? "";
  const newVisitor = !/^[0-9a-f-]{36}$/.test(visitor);
  if (newVisitor) visitor = crypto.randomUUID();

  if (/^AX\d{4,10}$/.test(listing)) {
    try {
      const db = createAdminClient();
      const { data: p } = await db.from("properties")
        .select("id, listing_no, website_published, development:developments(name), location:locations(name), agent:agents!properties_listing_agent_id_fkey(id, full_name, status, public_whatsapp, public_email, work_email)")
        .eq("listing_no", listing).is("deleted_at", null).maybeSingle();
      if (p) {
        const one = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? x[0] ?? null : x);
        const agent = one(p.agent as never) as { id: string; full_name: string; status: string; public_whatsapp: string | null; public_email: string | null; work_email: string | null } | null;
        const active = agent?.status === "active" ? agent : null;
        const wa = (active?.public_whatsapp ?? "").replace(/\D/g, "");
        if (wa.length >= 9) phone = wa;
        if (active?.public_email) email = active.public_email;
        const dev = one(p.development as never) as { name: string } | null, loc = one(p.location as never) as { name: string } | null;
        const where = `${dev?.name ?? "apartment"}, ${loc?.name ?? "Colombo"}`;
        text = `I'm interested in ${listing} (${where}). Is it still available for a viewing?`;
        // whose contact the button reached: the agent's when they have one set, else the company's
        const agentId = channel === "email" ? (active?.public_email ? active.id : null) : (wa.length >= 9 ? active?.id ?? null : null);

        if (!BOT.test(request.headers.get("user-agent") ?? "") && p.website_published) {
          const since = new Date(Date.now() - REPEAT_MINUTES * 60_000).toISOString();
          const { count: repeat } = newVisitor ? { count: 0 } : await db.from("whatsapp_clicks").select("id", { count: "exact", head: true })
            .eq("listing_no", listing).eq("channel", channel).eq("visitor", visitor).gte("clicked_at", since);
          if (!repeat) {
            await db.from("whatsapp_clicks").insert({ property_id: p.id, listing_no: listing, agent_id: agentId, page: from, channel, visitor });
            const { data: admins } = await db.from("agents").select("id").eq("role", "super_admin").eq("status", "active").is("deleted_at", null);
            const notes: { recipient_agent_id: string; kind: string; title: string; body: string; link: string }[] = [];
            if (agentId && active) {
              notes.push({
                recipient_agent_id: agentId, kind: "contact_tap",
                title: `Website visitor tapped ${VERB[channel]} on ${listing}`,
                body: `Someone on the website tapped ${VERB[channel]} on ${listing} (${where}), so they may be ${channel === "call" ? "calling" : channel === "email" ? "emailing" : "messaging"} you now. When they get in touch, log them as a lead so it's tracked.`,
                link: "/leads/new/",
              });
            }
            for (const a of admins ?? []) {
              if (a.id === agentId) continue;
              notes.push({
                recipient_agent_id: a.id, kind: "contact_tap",
                title: `${VERB[channel]} tap on ${listing}${active && agentId ? ` (to ${active.full_name})` : " (to the company)"}`,
                body: `From the website ${from} page, ${where}.`, link: `/properties/${listing}/`,
              });
            }
            if (notes.length) await db.from("notifications").insert(notes);
            if (agentId && active?.work_email) {
              await sendEmail({
                to: [active.work_email],
                subject: `Website enquiry on ${listing}: log the lead`,
                text: `Hi ${active.full_name.split(" ")[0]},\n\nSomeone on the Axe Realty website just tapped "${VERB[channel]}" on ${listing} (${where}), so they may be getting in touch now.\n\nWhen they do, add them as a lead in the CRM (it takes 30 seconds):\n${appUrl()}/leads/new/\n\nAxe Realty`,
              });
            }
          }
        }
      }
    } catch (e) {
      Sentry.captureException(e); // never block the visitor on our bookkeeping
    }
  }

  const to = channel === "call" ? `tel:+${phone.replace(/\D/g, "")}`
    : channel === "email" ? `mailto:${email}?subject=${encodeURIComponent(listing ? `Enquiry about ${listing}` : "Enquiry")}&body=${encodeURIComponent(text)}`
    : waLink(text, phone);
  const headers = new Headers({ Location: to, "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
  if (newVisitor) headers.append("Set-Cookie", `${COOKIE}=${visitor}; Path=/; Max-Age=2592000; SameSite=Lax; Secure; HttpOnly`);
  return new Response(null, { status: 302, headers });
}
