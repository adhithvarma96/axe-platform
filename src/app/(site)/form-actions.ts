"use server";
// Website forms (SPEC 11.5): every submission is saved raw first, then processed.
// Runs with the server's secret key; never reachable with the public key.
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type SubmitState = { ok?: boolean; error?: string };
type Db = ReturnType<typeof createAdminClient>;

const clean = (v: FormDataEntryValue | null, max = 2000) => String(v ?? "").replace(/\u0000/g, "").trim().slice(0, max);
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

/** E.164 with Sri Lanka (+94) as the default country: 077 123 4567 -> +94771234567. */
export async function normalizePhone(raw: string): Promise<string | null> {
  let d = raw.replace(/[^\d+]/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = `+${d.slice(2)}`;
  if (d.startsWith("+")) return /^\+\d{8,15}$/.test(d) ? d : null;
  if (d.startsWith("94") && d.length === 11) return `+${d}`;
  if (d.startsWith("0") && d.length === 10) return `+94${d.slice(1)}`;
  if (d.length === 9) return `+94${d}`;
  return d.length >= 8 && d.length <= 15 ? `+${d}` : null;
}

async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return process.env.VERCEL_ENV !== "production"; // not configured: allowed outside production only
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
  });
  return ((await r.json().catch(() => ({}))) as { success?: boolean }).success === true;
}

/** Common checks, then the raw submission is stored. Returns null when the request must stop. */
async function intake(form: FormData, kind: string, payload: Record<string, unknown>) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  if (!(await verifyTurnstile(clean(form.get("cf-turnstile-response"), 4000), ip))) {
    return { error: "Couldn't confirm you're not a robot. Please try again, or WhatsApp us." } as const;
  }
  const utm = Object.fromEntries(["utm_source", "utm_medium", "utm_campaign", "fbclid"].map((k) => [k, clean(form.get(k), 300) || null]));
  const db = createAdminClient();
  const { data, error } = await db
    .from("form_submissions")
    .insert({
      form: kind,
      payload: { ...payload, ...utm, page: (h.get("referer") ?? "").slice(0, 300) },
      ip_hash: ip ? createHash("sha256").update(ip).digest("hex").slice(0, 32) : null,
      user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: "Sorry, something went wrong. Please WhatsApp us instead." } as const;
  return { db, submissionId: data.id, utm } as const;
}

async function done(db: Db, submissionId: string, table: string, id: string) {
  await db.from("form_submissions").update({ processed_at: new Date().toISOString(), created_record_table: table, created_record_id: id }).eq("id", submissionId);
}
async function failed(db: Db, submissionId: string, e: unknown) {
  await db.from("form_submissions").update({ processing_error: String((e as Error)?.message ?? e).slice(0, 500) }).eq("id", submissionId);
}

/** In-app notifications for the given agents plus every Super Admin; email when Resend is configured. */
async function notify(db: Db, agentIds: (string | null | undefined)[], title: string, body: string, link: string) {
  const { data: admins } = await db.from("agents").select("id").eq("role", "super_admin").eq("status", "active").is("deleted_at", null);
  const ids = [...new Set([...agentIds.filter(Boolean), ...(admins ?? []).map((a) => a.id)])] as string[];
  if (!ids.length) return;
  await db.from("notifications").insert(ids.map((id) => ({ recipient_agent_id: id, kind: "website_form", title, body, link })));
  const key = process.env.RESEND_API_KEY, from = process.env.RESEND_FROM;
  if (!key || !from) return; // email arrives once Resend is set up
  const { data: people } = await db.from("agents").select("id, work_email").in("id", ids);
  const to = (people ?? []).map((p) => p.work_email).filter(Boolean) as string[];
  if (!to.length) return;
  const appUrl = process.env.APP_URL ?? "https://app.axerealty.lk";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject: title, text: `${body}\n\nOpen: ${appUrl}${link}` }),
  }).catch(() => {});
}

/** Finds a lead by phone or email (dedupe), else null. */
async function existingLead(db: Db, phone: string | null, email: string) {
  const ors = [phone ? `phone.eq.${phone}` : null, email ? `email.ilike.${email.replace(/[%_,()]/g, "")}` : null].filter(Boolean).join(",");
  if (!ors) return null;
  const { data } = await db.from("leads").select("id, assigned_agent_id, lead_code").or(ors).is("deleted_at", null).order("created_at", { ascending: false }).limit(1);
  return data?.[0] ?? null;
}

async function channelId(db: Db, name: string) {
  const { data } = await db.from("source_channels").select("id").eq("name", name).maybeSingle();
  return data?.id ?? null;
}

// ---------------------------------------------------------------------------
// Property enquiry (listing page)
// ---------------------------------------------------------------------------
export async function submitEnquiry(_prev: SubmitState, form: FormData): Promise<SubmitState> {
  if (clean(form.get("company_website"))) return { ok: true }; // honeypot
  const name = clean(form.get("name"), 120), email = clean(form.get("email"), 200).toLowerCase();
  const phone = await normalizePhone(clean(form.get("phone"), 40));
  const message = clean(form.get("message")), listingNo = clean(form.get("listing_no"), 20).toUpperCase();
  if (!name || !email || !clean(form.get("phone"))) return { error: "Please add your name, email and WhatsApp number." };
  if (!validEmail(email)) return { error: "That email address doesn't look right." };
  if (!phone) return { error: "That phone number doesn't look right. Include the country code if outside Sri Lanka." };

  const r = await intake(form, "property_inquiry", { name, email, phone, message, listing_no: listingNo || null });
  if ("error" in r) return { error: r.error };
  const { db, submissionId, utm } = r;
  try {
    const { data: prop } = listingNo
      ? await db.from("properties").select("id, listing_types, property_type, location_id, development_id, listing_agent_id").eq("listing_no", listingNo).maybeSingle()
      : { data: null };
    const note = [listingNo ? `Website enquiry about ${listingNo}.` : "Website enquiry.", message].filter(Boolean).join("\n");
    const found = await existingLead(db, phone, email);
    let leadId: string, agentId: string | null;
    if (found) {
      leadId = found.id;
      agentId = found.assigned_agent_id;
      await db.from("activities").insert({ type: "note", summary: note, lead_id: leadId, property_id: prop?.id ?? null });
    } else {
      const rent = prop?.listing_types?.some((t: string) => t.startsWith("rent")), sale = prop?.listing_types?.includes("sale");
      const { data: lead, error } = await db.from("leads").insert({
        name, email, phone, lead_source_type: "direct", source_channel_id: await channelId(db, "Website"),
        looking_for: rent && sale ? "either" : sale ? "buy" : rent ? "rent" : null,
        property_types_wanted: prop?.property_type ? [prop.property_type] : [],
        assigned_agent_id: prop?.listing_agent_id ?? null, detailed_requirements: note, ...utm,
      }).select("id").single();
      if (error) throw error;
      leadId = lead.id;
      agentId = prop?.listing_agent_id ?? null;
      if (prop?.location_id) await db.from("lead_preferred_locations").insert({ lead_id: leadId, location_id: prop.location_id });
      if (prop?.development_id) await db.from("lead_preferred_developments").insert({ lead_id: leadId, development_id: prop.development_id });
    }
    await done(db, submissionId, "leads", leadId);
    await notify(db, [agentId], `New website enquiry${listingNo ? ` for ${listingNo}` : ""}: ${name}`, `${name} · ${phone} · ${email}\n${message}`, `/leads/${leadId}`);
  } catch (e) {
    await failed(db, submissionId, e);
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Contact us
// ---------------------------------------------------------------------------
export async function submitContact(_prev: SubmitState, form: FormData): Promise<SubmitState> {
  if (clean(form.get("company_website"))) return { ok: true };
  const name = clean(form.get("name"), 120), email = clean(form.get("email"), 200).toLowerCase();
  const phone = await normalizePhone(clean(form.get("phone"), 40)), message = clean(form.get("message"));
  if (!name || !email || !message) return { error: "Please add your name, email and a message." };
  if (!validEmail(email)) return { error: "That email address doesn't look right." };
  if (clean(form.get("phone")) && !phone) return { error: "That phone number doesn't look right." };

  const r = await intake(form, "contact", { name, email, phone, message });
  if ("error" in r) return { error: r.error };
  const { db, submissionId, utm } = r;
  try {
    const found = await existingLead(db, phone, email);
    let leadId: string;
    if (found) {
      leadId = found.id;
      await db.from("activities").insert({ type: "note", summary: `Contact form: ${message}`, lead_id: leadId });
    } else {
      const { data: lead, error } = await db.from("leads").insert({
        name, email, phone, lead_source_type: "direct", source_channel_id: await channelId(db, "Website – Contact Us"),
        detailed_requirements: message, ...utm,
      }).select("id").single();
      if (error) throw error;
      leadId = lead.id;
    }
    await done(db, submissionId, "leads", leadId);
    await notify(db, [], `Website contact form: ${name}`, `${name} · ${phone ?? "no phone"} · ${email}\n${message}`, `/leads/${leadId}`);
  } catch (e) {
    await failed(db, submissionId, e);
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// List your property (owners): speed-to-lead matters, so Adhith also gets a task for today.
// ---------------------------------------------------------------------------
export async function submitOwner(_prev: SubmitState, form: FormData): Promise<SubmitState> {
  if (clean(form.get("company_website"))) return { ok: true };
  const name = clean(form.get("name"), 120), email = clean(form.get("email"), 200).toLowerCase();
  const phone = await normalizePhone(clean(form.get("phone"), 40));
  const goal = clean(form.get("goal"), 10), development = clean(form.get("development"), 120), beds = clean(form.get("beds"), 4);
  const furnishing = clean(form.get("furnishing"), 20), available = clean(form.get("available_from"), 10), notes = clean(form.get("notes"));
  if (!name || !phone || !email) return { error: "Please add your name, WhatsApp number and email." };
  if (!validEmail(email)) return { error: "That email address doesn't look right." };

  const details = { goal, development, beds, furnishing, available_from: available || null, notes };
  const r = await intake(form, "list_your_property", { name, email, phone, ...details });
  if ("error" in r) return { error: r.error };
  const { db, submissionId } = r;
  try {
    const summary = [
      `Website "List your property": wants to ${goal === "sale" ? "sell" : goal === "both" ? "rent or sell" : "rent out"}.`,
      development && `Development: ${development}`, beds && `Bedrooms: ${beds}`, furnishing && `Furnishing: ${furnishing}`,
      available && `Available from: ${available}`, notes,
    ].filter(Boolean).join("\n");
    const { data: src } = await db.from("owner_sources").select("id").eq("name", "Website").maybeSingle();
    const { data: existing } = await db.from("owners").select("id").or(`primary_phone.eq.${phone},email.ilike.${email.replace(/[%_,()]/g, "")}`).is("deleted_at", null).limit(1);
    let ownerId: string;
    if (existing?.[0]) {
      ownerId = existing[0].id;
      await db.from("activities").insert({ type: "note", summary, owner_id: ownerId });
    } else {
      const { data: owner, error } = await db.from("owners").insert({ name, primary_phone: phone, whatsapp: phone, email, owner_source_id: src?.id ?? null, notes: summary }).select("id").single();
      if (error) throw error;
      ownerId = owner.id;
    }
    const { data: admins } = await db.from("agents").select("id").eq("role", "super_admin").eq("status", "active").limit(1);
    await db.from("tasks").insert({
      title: `Call new owner from the website: ${name}`, details: `${phone} · ${email}\n${summary}`,
      due_on: new Date().toISOString().slice(0, 10), assignee_agent_id: admins?.[0]?.id ?? null, owner_id: ownerId,
    });
    await done(db, submissionId, "owners", ownerId);
    await notify(db, [], `New owner wants to list: ${name}`, `${phone} · ${email}\n${summary}`, `/owners/${ownerId}`);
  } catch (e) {
    await failed(db, submissionId, e);
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Colombo Apartment Report (marketing lead; report delivery email arrives in Phase 4)
// ---------------------------------------------------------------------------
export async function submitReport(_prev: SubmitState, form: FormData): Promise<SubmitState> {
  if (clean(form.get("company_website"))) return { ok: true };
  const name = clean(form.get("name"), 120), email = clean(form.get("email"), 200).toLowerCase();
  const whatsapp = await normalizePhone(clean(form.get("whatsapp"), 40));
  const audience = clean(form.get("audience"), 20), area = clean(form.get("development_or_area"), 120);
  if (!email || !validEmail(email)) return { error: "Please add a valid email address so we can send you the report." };
  if (!["owner", "buyer_investor", "tenant"].includes(audience)) return { error: "Please tell us which describes you." };
  if (form.get("consent") !== "on") return { error: "Please tick the box so we can email you the report." };

  const r = await intake(form, "report", { name, email, whatsapp, audience, area });
  if ("error" in r) return { error: r.error };
  const { db, submissionId, utm } = r;
  try {
    const { data: src } = await db.from("marketing_sources").select("id").eq("name", "Report – Landing Page").maybeSingle();
    // Upsert by email, case-insensitive (the unique index is on lower(email)).
    const row = {
      email, name: name || null, whatsapp, audience_type: audience as "owner" | "buyer_investor" | "tenant",
      development_or_area: area || null, source_id: src?.id ?? null, marketing_opt_in: true, submitted_at: new Date().toISOString(), ...utm,
    };
    const { data: prev } = await db.from("marketing_leads").select("id").ilike("email", email.replace(/[%_]/g, "")).maybeSingle();
    const { data: ml, error } = prev
      ? await db.from("marketing_leads").update(row).eq("id", prev.id).select("id").single()
      : await db.from("marketing_leads").insert(row).select("id").single();
    if (error) throw error;
    await done(db, submissionId, "marketing_leads", ml.id);
  } catch (e) {
    await failed(db, submissionId, e);
  }
  return { ok: true };
}
