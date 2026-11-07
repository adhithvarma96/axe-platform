"use server";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type SubmitState = { ok?: boolean; error?: string };

const clean = (v: FormDataEntryValue | null, max = 2000) => String(v ?? "").replace(/\u0000/g, "").trim().slice(0, max);

async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return process.env.VERCEL_ENV !== "production"; // not configured: allowed outside production only
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
  });
  const j = (await r.json().catch(() => ({}))) as { success?: boolean };
  return j.success === true;
}

/** Listing enquiry: saved raw first (nothing is lost), then a lead is created for the team. */
export async function submitEnquiry(_prev: SubmitState, form: FormData): Promise<SubmitState> {
  if (clean(form.get("company_website"))) return { ok: true }; // honeypot: bots fill hidden fields; pretend success
  const name = clean(form.get("name"), 120);
  const email = clean(form.get("email"), 200);
  const phone = clean(form.get("phone"), 40);
  const message = clean(form.get("message"), 2000);
  const listingNo = clean(form.get("listing_no"), 20).toUpperCase();
  if (!name || !phone || !email) return { error: "Please add your name, email and WhatsApp number." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email address doesn't look right." };
  if (phone.replace(/\D/g, "").length < 7) return { error: "That phone number looks too short." };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  if (!(await verifyTurnstile(clean(form.get("cf-turnstile-response"), 4000), ip))) {
    return { error: "Couldn't confirm you're not a robot. Please try again, or WhatsApp us." };
  }

  const db = createAdminClient();
  const payload = { name, email, phone, message, listing_no: listingNo || null, page: (h.get("referer") ?? "").slice(0, 300) };
  const { data: sub, error: subErr } = await db
    .from("form_submissions")
    .insert({ form: "property_inquiry", payload, ip_hash: ip ? createHash("sha256").update(ip).digest("hex").slice(0, 32) : null, user_agent: h.get("user-agent")?.slice(0, 300) ?? null })
    .select("id")
    .single();
  if (subErr) return { error: "Sorry, something went wrong. Please WhatsApp us instead." };

  try {
    const [{ data: channel }, { data: prop }] = await Promise.all([
      db.from("source_channels").select("id").eq("name", "Website").maybeSingle(),
      listingNo ? db.from("properties").select("id, listing_types, property_type, location_id, development_id, listing_agent_id").eq("listing_no", listingNo).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const rent = prop?.listing_types?.some((t: string) => t.startsWith("rent"));
    const sale = prop?.listing_types?.includes("sale");
    const { data: lead, error } = await db
      .from("leads")
      .insert({
        name, email, phone,
        lead_source_type: "direct",
        source_channel_id: channel?.id ?? null,
        looking_for: rent && sale ? "either" : sale ? "buy" : rent ? "rent" : null,
        property_types_wanted: prop?.property_type ? [prop.property_type] : [],
        assigned_agent_id: prop?.listing_agent_id ?? null,
        detailed_requirements: [listingNo ? `Website enquiry about ${listingNo}.` : "Website enquiry.", message].filter(Boolean).join("\n"),
      })
      .select("id")
      .single();
    if (error) throw error;
    if (prop?.location_id) await db.from("lead_preferred_locations").insert({ lead_id: lead.id, location_id: prop.location_id });
    if (prop?.development_id) await db.from("lead_preferred_developments").insert({ lead_id: lead.id, development_id: prop.development_id });
    await db.from("form_submissions").update({ processed_at: new Date().toISOString(), created_record_table: "leads", created_record_id: lead.id }).eq("id", sub.id);
  } catch (e) {
    // The raw submission is safe; the team sees it in form submissions even if lead creation failed.
    await db.from("form_submissions").update({ processing_error: String((e as Error).message ?? e).slice(0, 500) }).eq("id", sub.id);
  }
  return { ok: true };
}
