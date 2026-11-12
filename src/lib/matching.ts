import "server-only";
// AI matching (SPEC 7.10), both directions.
//   Lead -> up to 5 available properties.  Property -> up to 5 active leads and owner-buyers.
// The database does the hard filtering (type, rent/sale, budget +-10%, bedrooms, must-have
// features); Claude only ranks the shortlist and writes a one-line reason for each pick, as
// structured JSON. Results are stored in match_results so the screens show clickable matches.
// Without an API key (or if the model declines), a rules-only ranking is saved instead.
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { money } from "@/lib/format";
import type { Database } from "@/lib/database.types";
import { bedsFit, budgetFits } from "@/lib/match-rules";

type Db = SupabaseClient<Database>;
export type MatchKind = "lead" | "owner" | "property";
export interface MatchCandidate { id: string; kind: MatchKind; ref: string; summary: string; score: number; preferredDev: boolean }
export interface MatchOutcome { runId: string | null; count: number; note: string | null; model: string; error?: string }

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
const SHORTLIST = 40;
const ACTIVE_EXCLUDED = ["closed_won", "lost", "dormant"];

/** Latest USD/LKR rate, for comparing a USD budget with an LKR price (or the reverse). */
async function usdLkr(db: Db): Promise<number> {
  const { data } = await db.from("fx_rates").select("usd_lkr").is("deleted_at", null).order("rate_date", { ascending: false }).limit(1);
  return Number(data?.[0]?.usd_lkr ?? 300);
}
const toUsd = (amount: number | null, cur: string | null, rate: number) => (amount == null ? null : cur === "LKR" ? amount / rate : amount);

type PropertyRow = {
  id: string; listing_no: string | null; property_type: string; listing_types: string[] | null; beds: number | null; square_feet: number | null;
  asking_rent: number | null; rent_currency: string | null; asking_sale_price: number | null; sale_currency: string | null; furnished: string | null;
  development_id: string | null; location_id: string | null; development: { name: string } | null; location: { name: string } | null;
  features: { feature_id: string; feature: { name: string } | null }[];
};
const PROPERTY_SELECT = "id, listing_no, property_type, listing_types, beds, square_feet, asking_rent, rent_currency, asking_sale_price, sale_currency, furnished, development_id, location_id, development:developments(name), location:locations(name), features:property_feature_links(feature_id, feature:property_features(name))";

function propertySummary(p: PropertyRow): string {
  return [
    p.listing_no, p.development?.name ?? p.property_type, p.location?.name,
    p.beds != null ? `${p.beds} bed` : null, p.square_feet ? `${Math.round(p.square_feet)} sq ft` : null,
    p.asking_rent != null ? `rent ${money(p.asking_rent, p.rent_currency)}/mo` : null,
    p.asking_sale_price != null ? `sale ${money(p.asking_sale_price, p.sale_currency)}` : null,
    p.furnished && p.furnished !== "unknown" ? `${p.furnished} furnished` : null,
    p.features.length ? `features: ${p.features.map((f) => f.feature?.name).filter(Boolean).join(", ")}` : null,
  ].filter(Boolean).join(" | ");
}

// ---------------------------------------------------------------- lead -> properties
export async function matchLead(db: Db, leadId: string): Promise<MatchOutcome> {
  const { data: lead } = await db.from("leads")
    .select("id, lead_code, name, looking_for, property_types_wanted, bedrooms, budget_min, budget_max, budget_currency, detailed_requirements, prefs_dev:lead_preferred_developments(development_id, development:developments(name)), prefs_loc:lead_preferred_locations(location_id, location:locations(name)), wants:lead_features_wanted(feature_id, feature:property_features(name))")
    .eq("id", leadId).maybeSingle();
  if (!lead) return { runId: null, count: 0, note: null, model: MODEL, error: "Lead not found." };
  const rate = await usdLkr(db);
  const prefDevs = new Set((lead.prefs_dev ?? []).map((x) => x.development_id));
  const prefLocs = new Set((lead.prefs_loc ?? []).map((x) => x.location_id));
  const mustHave = (lead.wants ?? []).map((x) => x.feature_id);
  const wantsRent = lead.looking_for !== "buy", wantsBuy = lead.looking_for === "buy" || lead.looking_for === "either";
  const minUsd = toUsd(lead.budget_min, lead.budget_currency, rate), maxUsd = toUsd(lead.budget_max, lead.budget_currency, rate);

  let q = db.from("properties").select(PROPERTY_SELECT).eq("status", "available").is("deleted_at", null).limit(2000);
  if ((lead.property_types_wanted ?? []).length) q = q.in("property_type", lead.property_types_wanted as never);
  const { data: props } = await q;
  const cands: MatchCandidate[] = [];
  for (const p of (props ?? []) as unknown as PropertyRow[]) {
    const types = p.listing_types ?? [];
    const rentOk = wantsRent && types.some((t) => t.startsWith("rent"));
    const saleOk = wantsBuy && types.includes("sale");
    if (!rentOk && !saleOk) continue;
    const have = new Set(p.features.map((f) => f.feature_id));
    if (mustHave.some((f) => !have.has(f))) continue; // rule 1: must-haves are non-negotiable
    if (!bedsFit(lead.bedrooms, p.beds)) continue;
    const price = rentOk ? toUsd(p.asking_rent, p.rent_currency, rate) : toUsd(p.asking_sale_price, p.sale_currency, rate);
    if (!budgetFits(price, minUsd, maxUsd)) continue;
    const preferredDev = !!p.development_id && prefDevs.has(p.development_id);
    const score = (preferredDev ? 100 : 0) + (p.location_id && prefLocs.has(p.location_id) ? 40 : 0) + (p.beds === lead.bedrooms ? 10 : 0)
      + (price != null && maxUsd ? Math.max(0, 10 - Math.abs(maxUsd - price) / maxUsd * 10) : 0);
    cands.push({ id: p.id, kind: "property", ref: p.listing_no ?? p.id, summary: propertySummary(p), score, preferredDev });
  }
  const brief = [
    `Lead ${lead.lead_code}: looking to ${lead.looking_for ?? "rent"}`,
    (lead.property_types_wanted ?? []).length ? `types: ${(lead.property_types_wanted ?? []).join(", ")}` : null,
    lead.bedrooms != null ? `bedrooms: ${lead.bedrooms}` : null,
    lead.budget_max != null || lead.budget_min != null ? `budget: ${lead.budget_min != null ? money(lead.budget_min, lead.budget_currency) : "?"} to ${lead.budget_max != null ? money(lead.budget_max, lead.budget_currency) : "?"}` : null,
    (lead.prefs_dev ?? []).length ? `preferred developments: ${(lead.prefs_dev ?? []).map((x) => x.development?.name).filter(Boolean).join(", ")}` : "preferred developments: none given",
    (lead.prefs_loc ?? []).length ? `preferred areas: ${(lead.prefs_loc ?? []).map((x) => x.location?.name).filter(Boolean).join(", ")}` : null,
    mustHave.length ? `must-have features: ${(lead.wants ?? []).map((x) => x.feature?.name).filter(Boolean).join(", ")}` : null,
    lead.detailed_requirements ? `notes: ${lead.detailed_requirements.slice(0, 600)}` : null,
  ].filter(Boolean).join("\n");
  return rankAndSave(db, { table: "leads", id: lead.id }, cands, brief, "lead");
}

// ---------------------------------------------------------------- property -> leads + owner-buyers
export async function matchProperty(db: Db, propertyId: string): Promise<MatchOutcome & { leadAgents?: { leadId: string; agentId: string | null; name: string; code: string | null }[] }> {
  const { data } = await db.from("properties").select(PROPERTY_SELECT).eq("id", propertyId).maybeSingle();
  if (!data) return { runId: null, count: 0, note: null, model: MODEL, error: "Property not found." };
  const p = data as unknown as PropertyRow;
  const rate = await usdLkr(db);
  const types = p.listing_types ?? [];
  const forRent = types.some((t) => t.startsWith("rent")), forSale = types.includes("sale");
  const have = new Set(p.features.map((f) => f.feature_id));
  const rentUsd = toUsd(p.asking_rent, p.rent_currency, rate), saleUsd = toUsd(p.asking_sale_price, p.sale_currency, rate);

  const [leadsQ, ownersQ] = await Promise.all([
    db.from("leads").select("id, lead_code, name, assigned_agent_id, looking_for, property_types_wanted, bedrooms, budget_min, budget_max, budget_currency, urgency, prefs_dev:lead_preferred_developments(development_id), prefs_loc:lead_preferred_locations(location_id), wants:lead_features_wanted(feature_id)")
      .is("deleted_at", null).not("pipeline_status", "in", `(${ACTIVE_EXCLUDED.join(",")})`).limit(3000),
    db.from("owners").select("id, name, buying_looking_for, buying_property_types, buying_budget_min, buying_budget_max, buying_budget_currency, buying_notes, locs:owner_buying_locations(location_id)")
      .is("deleted_at", null).eq("open_to_buying", true).limit(500),
  ]);
  const cands: MatchCandidate[] = [];
  for (const l of leadsQ.data ?? []) {
    const wantsRent = l.looking_for !== "buy", wantsBuy = l.looking_for === "buy" || l.looking_for === "either";
    const rentOk = wantsRent && forRent, saleOk = wantsBuy && forSale;
    if (!rentOk && !saleOk) continue;
    if ((l.property_types_wanted ?? []).length && !(l.property_types_wanted ?? []).includes(p.property_type as never)) continue;
    if ((l.wants ?? []).some((w) => !have.has(w.feature_id))) continue; // the lead needs a feature this property lacks
    if (!bedsFit(l.bedrooms, p.beds)) continue;
    const price = rentOk ? rentUsd : saleUsd;
    if (!budgetFits(price, toUsd(l.budget_min, l.budget_currency, rate), toUsd(l.budget_max, l.budget_currency, rate))) continue;
    const preferredDev = !!p.development_id && (l.prefs_dev ?? []).some((x) => x.development_id === p.development_id);
    const prefArea = !!p.location_id && (l.prefs_loc ?? []).some((x) => x.location_id === p.location_id);
    const score = (preferredDev ? 100 : 0) + (prefArea ? 40 : 0) + (l.bedrooms === p.beds ? 10 : 0) + (l.urgency === "immediate" || l.urgency === "high" ? 5 : 0);
    cands.push({
      id: l.id, kind: "lead", ref: l.lead_code ?? l.id, preferredDev, score,
      summary: [`LEAD ${l.lead_code} ${l.name}`, `wants to ${l.looking_for ?? "rent"}`, l.bedrooms != null ? `${l.bedrooms} bed` : null,
        l.budget_max != null ? `budget up to ${money(l.budget_max, l.budget_currency)}` : null, preferredDev ? "PREFERRED DEVELOPMENT" : null,
        prefArea ? "preferred area" : null, l.urgency ? `urgency ${l.urgency}` : null].filter(Boolean).join(" | "),
    });
  }
  for (const o of ownersQ.data ?? []) {
    if (!forSale) continue; // owner-buyers are buyers
    if ((o.buying_property_types ?? []).length && !(o.buying_property_types ?? []).includes(p.property_type as never)) continue;
    if (!budgetFits(saleUsd, toUsd(o.buying_budget_min, o.buying_budget_currency, rate), toUsd(o.buying_budget_max, o.buying_budget_currency, rate))) continue;
    const prefArea = !!p.location_id && (o.locs ?? []).some((x) => x.location_id === p.location_id);
    cands.push({
      id: o.id, kind: "owner", ref: `OWNER-${o.id.slice(0, 8)}`, preferredDev: false, score: 30 + (prefArea ? 40 : 0),
      summary: [`OWNER-BUYER ${o.name}`, o.buying_budget_max != null ? `budget up to ${money(o.buying_budget_max, o.buying_budget_currency)}` : null,
        prefArea ? "preferred area" : null, o.buying_notes ? `notes: ${o.buying_notes.slice(0, 200)}` : null].filter(Boolean).join(" | "),
    });
  }
  const brief = `Property ${propertySummary(p)}`;
  const out = await rankAndSave(db, { table: "properties", id: p.id }, cands, brief, "property");
  return out;
}

// ---------------------------------------------------------------- ranking (Claude, else rules)
const RANK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["note", "matches"],
  properties: {
    note: { type: "string", description: "One short sentence for the agent, e.g. that none of the matches are in the client's preferred developments. Empty string if nothing to say." },
    matches: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["ref", "reason"],
        properties: { ref: { type: "string" }, reason: { type: "string" } },
      },
    },
  },
} as const;

async function rankAndSave(db: Db, source: { table: "leads" | "properties"; id: string }, all: MatchCandidate[], brief: string, direction: "lead" | "property"): Promise<MatchOutcome> {
  const shortlist = [...all].sort((a, b) => b.score - a.score).slice(0, SHORTLIST);
  const runId = crypto.randomUUID();
  if (!shortlist.length) {
    return { runId: null, count: 0, model: "rules", note: direction === "lead" ? "No available listing passes this lead's must-haves, type, budget and bedrooms." : "No active lead or owner-buyer fits this property's type, budget, bedrooms and features." };
  }
  let picks: { c: MatchCandidate; reason: string }[] = [];
  let note: string | null = null;
  let model = "rules";

  // A key pasted into Vercel with a trailing space or line break would make every call fail.
  const apiKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  let aiProblem: string | null = apiKey ? null : "no ANTHROPIC_API_KEY on this server (add it in Vercel, then redeploy)";
  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });
      const rules = direction === "lead"
        ? `Rank properties for this client. Rules in priority order: (1) the must-have features are already guaranteed; (2) strongly prioritise properties in the client's preferred developments; (3) then the preferred areas; (4) budget within range or 10% tolerance; (5) bedrooms exact or one more. Return up to 5 genuinely good matches; never force 5. Each reason is one sentence and says explicitly when the property is in a preferred development. If none are in the preferred developments, say so in "note".`
        : `Rank buyers/tenants for this property. Candidates are labelled LEAD or OWNER-BUYER. Rules: a preferred-development match is a PRIORITY MATCH and goes first; then preferred areas; then budget fit (10% tolerance) and bedrooms (exact or one more). Owner-buyers are especially valuable. Return up to 5 genuinely good matches; never force 5. Each reason is one sentence, starting with LEAD or OWNER-BUYER.`;
      const request = {
        model: MODEL,
        max_tokens: 4000,
        output_config: { effort: "low" as const, format: { type: "json_schema" as const, schema: RANK_SCHEMA as unknown as Record<string, unknown> } },
        system: "You match clients and apartments for Axe Realty, a Colombo apartment brokerage. Use only the facts given. Refer to candidates by their ref exactly as written. Reasons are plain, specific and short, for a property agent to read on a phone.",
        messages: [{
          role: "user" as const,
          content: `${rules}\n\n${brief}\n\nCandidates (ref: summary):\n${shortlist.map((c) => `${c.ref}: ${c.summary}`).join("\n")}`,
        }],
      };
      let response;
      try {
        // server-side refusal fallback: if the model declines, the API retries on a fallback model
        response = await client.beta.messages.create({ ...request, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" });
      } catch (e) {
        // an account without access to that beta gets a 400: run the same request without it
        if (e instanceof Anthropic.BadRequestError && /fallback|beta/i.test(e.message)) response = await client.beta.messages.create(request);
        else throw e;
      }
      if (response.stop_reason === "refusal") aiProblem = "the model declined this request";
      else {
        const text = response.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
        const parsed = JSON.parse(text) as { note: string; matches: { ref: string; reason: string }[] };
        const byRef = new Map(shortlist.map((c) => [c.ref, c]));
        picks = parsed.matches.map((m) => ({ c: byRef.get(m.ref)!, reason: m.reason })).filter((x) => x.c).slice(0, 5);
        note = parsed.note?.trim() || null;
        model = response.model;
      }
    } catch (e) {
      aiProblem = describeError(e);
      console.error("matching: model call failed, using rules:", aiProblem);
    }
  }
  if (aiProblem && model === "rules") model = `rules: ${aiProblem}`.slice(0, 200);
  if (!picks.length && model.startsWith("rules")) {
    picks = shortlist.slice(0, 5).map((c) => ({ c, reason: ruleReason(c, direction) }));
    if (direction === "lead" && !picks.some((x) => x.c.preferredDev)) note = "None of these are in the client's preferred developments.";
  }
  if (!picks.length) return { runId: null, count: 0, note: note ?? "No strong matches this time.", model };

  const rows = picks.map((x, i) => ({
    source_table: source.table, source_id: source.id, run_id: runId, rank: i + 1, model,
    matched_table: x.c.kind === "lead" ? "leads" : x.c.kind === "owner" ? "owners" : "properties", matched_id: x.c.id,
    reason: x.reason, run_note: note,
  }));
  const { error } = await db.from("match_results").insert(rows);
  if (error) return { runId: null, count: 0, note, model, error: error.message };
  return { runId, count: rows.length, note, model };
}

/** A short, safe explanation of why the AI call failed (never includes the key). */
function describeError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "the API key was rejected (401): check it was copied in full, and that it hasn't been revoked";
  if (e instanceof Anthropic.PermissionDeniedError) return "the API key isn't allowed to use this model (403)";
  if (e instanceof Anthropic.NotFoundError) return `model ${MODEL} isn't available to this account (404)`;
  if (e instanceof Anthropic.RateLimitError) return "rate limited (429): try again in a minute";
  if (e instanceof Anthropic.BadRequestError) return /credit/i.test(e.message) ? "the Anthropic account has no credit (add billing in the Console)" : `request rejected (400): ${e.message.slice(0, 120)}`;
  if (e instanceof Anthropic.APIError) return `Anthropic API error ${e.status ?? ""}`.trim();
  if (e instanceof SyntaxError) return "the model's answer couldn't be read";
  return (e as Error)?.message?.slice(0, 120) ?? "unknown error";
}

function ruleReason(c: MatchCandidate, direction: "lead" | "property"): string {
  const bits = c.summary.split(" | ");
  if (direction === "lead") return `${c.preferredDev ? "In a preferred development. " : ""}Fits type, budget and bedrooms: ${bits.slice(1, 6).join(", ")}.`;
  return `${c.kind === "owner" ? "OWNER-BUYER" : "LEAD"}: ${bits.slice(1).join(", ")}.`;
}
