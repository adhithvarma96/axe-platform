// Phase 2/3 rules (SPEC 7.2, 7.4, 7.8, 7.9): gates, viewing -> lead moves, the commission engine
// against Schedule A v1.0, and what a closing does to its property, lead and payout schedule.
import { beforeAll, describe, expect, it } from "vitest";
import { as, freshDb, makeUser, type Db } from "./harness";

let db: Db;
let admin: { uid: string; agentId: string };
let sabry: { uid: string; agentId: string };
let anuk: { uid: string; agentId: string };
let partner: string;

const ADMIN = () => ({ role: "authenticated" as const, sub: admin.uid, aal: "aal2" as const });
const AGENT = () => ({ role: "authenticated" as const, sub: sabry.uid });

async function lead(fields: Record<string, unknown> = {}) {
  const cols = ["name", ...Object.keys(fields)];
  const vals = ["Test lead", ...Object.values(fields)];
  const { rows } = await db.query<{ id: string }>(
    `insert into public.leads (${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")}) returning id`, vals);
  return rows[0].id;
}
async function property(fields: Record<string, unknown> = {}) {
  const base = { property_type: "apartment", status: "available", square_feet: 1000, ...fields };
  const cols = Object.keys(base);
  const { rows } = await db.query<{ id: string }>(
    `insert into public.properties (${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")}) returning id`, Object.values(base));
  return rows[0].id;
}
const stage = async (id: string) => (await db.query<{ s: string }>("select pipeline_status s from public.leads where id = $1", [id])).rows[0].s;
const tick = (id: string, key: string) => db.query("insert into public.lead_gate_ticks (lead_id, gate_item_key) values ($1, $2)", [id, key]);

beforeAll(async () => {
  db = await freshDb();
  admin = await makeUser(db, "super_admin", "Adhith Chandrasekar");
  sabry = await makeUser(db, "agent", "Sabry Doole");
  anuk = await makeUser(db, "agent", "Anuk Balasooriya");
  await db.query("insert into public.agent_hr (agent_id, commission_exempt) values ($1, true)", [admin.agentId]);
  await db.query("insert into public.agent_hr (agent_id, probation_end_date) values ($1, '2026-12-01'), ($2, '2026-12-01')", [sabry.agentId, anuk.agentId]);
  const { rows } = await db.query<{ id: string }>("insert into public.referral_partners (full_name) values ('Ref One') returning id");
  partner = rows[0].id;
}, 60_000);

describe("pipeline gates (7.8)", () => {
  it("refuses Ongoing Negotiations without Gate 1, lists what's missing and logs the attempt", async () => {
    const id = await lead({ assigned_agent_id: sabry.agentId });
    const res = await as(db, AGENT(), () => db.query<{ r: { ok: boolean; missing: string[] } }>("select public.move_lead($1, 'ongoing_negotiations') r", [id]));
    expect(res.rows[0].r.ok).toBe(false);
    expect(res.rows[0].r.missing).toEqual(["Offer sent using the Axe Realty offer template"]);
    expect(await stage(id)).toBe("new");
    const logged = await db.query("select 1 from public.gate_breach_attempts where lead_id = $1", [id]);
    expect(logged.rows).toHaveLength(1);
    const note = await db.query("select 1 from public.notifications where kind = 'gate_breach' and recipient_agent_id = $1", [admin.agentId]);
    expect(note.rows.length).toBeGreaterThan(0);
  });

  it("blocks a direct update too, not only the app's route", async () => {
    const id = await lead();
    await expect(as(db, AGENT(), () => db.query("update public.leads set pipeline_status = 'deposit_paid' where id = $1", [id]))).rejects.toThrow(/GATE/);
  });

  it("lets the move through once the items are ticked, and keeps ticks sticky for agents", async () => {
    const id = await lead();
    await as(db, AGENT(), () => tick(id, "gate1_offer_sent"));
    const ok = await as(db, AGENT(), () => db.query<{ r: { ok: boolean } }>("select public.move_lead($1, 'ongoing_negotiations') r", [id]));
    expect(ok.rows[0].r.ok).toBe(true);
    expect(await stage(id)).toBe("ongoing_negotiations");
    await as(db, AGENT(), () => db.query("delete from public.lead_gate_ticks where lead_id = $1", [id])).catch(() => {});
    const still = await db.query("select 1 from public.lead_gate_ticks where lead_id = $1", [id]);
    expect(still.rows).toHaveLength(1); // row-level security and the trigger both keep it
    const who = await db.query<{ ticked_by: string }>("select ticked_by from public.lead_gate_ticks where lead_id = $1", [id]);
    expect(who.rows[0].ticked_by).toBe(sabry.uid);
  });

  it("requires every earlier gate when jumping ahead", async () => {
    const id = await lead();
    await tick(id, "gate2_price_agreed");
    const r = await as(db, AGENT(), () => db.query<{ r: { missing: string[] } }>("select public.move_lead($1, 'deposit_paid') r", [id]));
    expect(r.rows[0].r.missing).toContain("Offer sent using the Axe Realty offer template");
    expect(r.rows[0].r.missing).not.toContain("Price agreed");
  });

  it("lets a Super Admin override with a reason, recorded in the stage history", async () => {
    const id = await lead();
    const r = await as(db, ADMIN(), () => db.query<{ r: { ok: boolean } }>("select public.move_lead($1, 'ongoing_negotiations', null, 'Offer sent by email before the template existed') r", [id]));
    expect(r.rows[0].r.ok).toBe(true);
    const h = await db.query<{ override_reason: string }>("select override_reason from public.lead_stage_history where lead_id = $1 and to_status = 'ongoing_negotiations'", [id]);
    expect(h.rows[0].override_reason).toMatch(/before the template/);
  });

  it("ignores an override reason from an agent", async () => {
    const id = await lead();
    const r = await as(db, AGENT(), () => db.query<{ r: { ok: boolean } }>("select public.move_lead($1, 'ongoing_negotiations', null, 'trust me') r", [id]));
    expect(r.rows[0].r.ok).toBe(false);
  });

  it("needs a lost reason to mark a lead Lost", async () => {
    const id = await lead();
    const r = await as(db, AGENT(), () => db.query<{ r: { ok: boolean; error: string } }>("select public.move_lead($1, 'lost') r", [id]));
    expect(r.rows[0].r.error).toMatch(/lost reason/);
    const { rows } = await db.query<{ id: string }>("select id from public.lost_reasons limit 1");
    const ok = await as(db, AGENT(), () => db.query<{ r: { ok: boolean } }>("select public.move_lead($1, 'lost', $2) r", [id, rows[0].id]));
    expect(ok.rows[0].r.ok).toBe(true);
  });
});

describe("viewing outcome moves the lead (7.4)", () => {
  const view = (leadId: string, outcome: string, date = "2026-01-05") =>
    db.query<{ id: string }>("insert into public.viewings (date, lead_id, outcome, conducted_by_agent_id) values ($1, $2, $3, $4) returning id", [date, leadId, outcome, sabry.agentId]);

  it("future pending -> Viewing Scheduled; past pending or Interested -> Viewing Completed", async () => {
    const a = await lead(); await view(a, "pending", "2099-01-01");
    expect(await stage(a)).toBe("viewing_scheduled");
    const b = await lead(); await view(b, "interested");
    expect(await stage(b)).toBe("viewing_completed");
  });

  it("never moves a lead backwards", async () => {
    const id = await lead();
    await tick(id, "gate1_offer_sent");
    await db.query("update public.leads set pipeline_status = 'ongoing_negotiations' where id = $1", [id]);
    await view(id, "wants_second_viewing");
    expect(await stage(id)).toBe("ongoing_negotiations");
  });

  it("Made Offer without Gate 1 leaves the lead and creates a task instead", async () => {
    const id = await lead({ assigned_agent_id: anuk.agentId });
    await view(id, "made_offer");
    expect(await stage(id)).toBe("new");
    const t = await db.query<{ assignee_agent_id: string }>("select assignee_agent_id from public.tasks where lead_id = $1", [id]);
    expect(t.rows[0].assignee_agent_id).toBe(anuk.agentId);
  });

  it("Made Offer with Gate 1 ticked -> Ongoing Negotiations", async () => {
    const id = await lead();
    await tick(id, "gate1_offer_sent");
    await view(id, "made_offer");
    expect(await stage(id)).toBe("ongoing_negotiations");
  });
});

describe("commission engine (7.9, Schedule A v1.0)", () => {
  type Row = Record<string, string | null>;
  async function close(opts: {
    date?: string; leadModel: string; listModel: string; leadAgent?: string | null; listAgent?: string | null; commission?: number;
  }): Promise<Row> {
    const l = await lead({ sourcing_model: opts.leadModel, referral_partner_id: opts.leadModel.includes("referrer") ? partner : null });
    const p = await property({ sourcing_model: opts.listModel, referral_partner_id: opts.listModel.includes("referrer") ? partner : null });
    const { rows } = await as(db, ADMIN(), () => db.query<Row>(
      `insert into public.closings (closing_date, deal_type, lead_id, property_id, lead_side_agent_id, listing_side_agent_id,
         our_commission, commission_currency, monthly_rent, total_deal_value, deal_currency, usd_lkr_rate)
       values ($1, 'rental', $2, $3, $4, $5, $6, 'LKR', 1000000, 12000000, 'LKR', 300) returning *`,
      [opts.date ?? "2026-12-15", l, p, opts.leadAgent === undefined ? sabry.agentId : opts.leadAgent,
       opts.listAgent === undefined ? anuk.agentId : opts.listAgent, opts.commission ?? 1000000]));
    return rows[0];
  }
  const n = (v: string | null) => Number(v);

  const MATRIX: [string, number, number, number, number, number, number][] = [
    // model, confirmed agent/ref/axe, probation agent/ref/axe
    ["company_direct", 17.5, 0, 32.5, 15, 0, 35],
    // referral partner at the default 15% of the side = 7.5 points of the side's 50
    ["company_via_referrer", 17.5, 7.5, 25, 15, 7.5, 27.5],
    ["agent_self_sourced", 25, 0, 25, 25, 0, 25],
    ["agent_via_referrer", 20, 7.5, 22.5, 20, 7.5, 22.5],
  ];

  for (const [model, ca, cr, cx, pa, pr, px] of MATRIX) {
    it(`${model}: confirmed ${ca}/${cr}/${cx}, probation ${pa}/${pr}/${px} per side`, async () => {
      const confirmed = await close({ leadModel: model, listModel: model, date: "2026-12-15" });
      expect([n(confirmed.lead_agent_rate), n(confirmed.lead_referrer_rate), n(confirmed.lead_axe_rate)]).toEqual([ca, cr, cx]);
      expect([n(confirmed.listing_agent_rate), n(confirmed.listing_referrer_rate), n(confirmed.listing_axe_rate)]).toEqual([ca, cr, cx]);
      expect(confirmed.lead_agent_tenure).toBe("confirmed");
      const probation = await close({ leadModel: model, listModel: model, date: "2026-11-20" });
      expect(probation.lead_agent_tenure).toBe("probation");
      expect([n(probation.lead_agent_rate), n(probation.lead_referrer_rate), n(probation.lead_axe_rate)]).toEqual([pa, pr, px]);
      expect(n(probation.split_delta)).toBe(0);
    });
  }

  it("pays exact amounts and balances: 1,000,000 company-direct both sides, confirmed", async () => {
    const c = await close({ leadModel: "company_direct", listModel: "company_direct" });
    expect([n(c.lead_agent_payout), n(c.listing_agent_payout), n(c.axe_total), n(c.agent_total)]).toEqual([175000, 175000, 650000, 350000]);
    expect(n(c.split_delta)).toBe(0);
  });

  it("owner rule: Adhith's side pays the agent 0 and rolls to Axe; the other side still pays its agent", async () => {
    const c = await close({ leadModel: "company_direct", listModel: "agent_self_sourced", leadAgent: admin.agentId, listAgent: sabry.agentId });
    expect(c.lead_agent_exempt).toBe(true);
    expect([n(c.lead_agent_rate), n(c.lead_axe_rate)]).toEqual([0, 50]);
    expect(n(c.listing_agent_rate)).toBe(25);
    expect(n(c.split_delta)).toBe(0);
  });

  it("a side with no agent sends the agent points to Axe", async () => {
    const c = await close({ leadModel: "company_direct", listModel: "company_direct", listAgent: null });
    expect([n(c.listing_agent_rate), n(c.listing_axe_rate)]).toEqual([0, 50]);
  });

  it("referral fees come out of Axe's share, never the agent's", async () => {
    const c = await close({ leadModel: "agent_via_referrer", listModel: "company_direct" });
    expect([n(c.lead_agent_rate), n(c.lead_referrer_rate), n(c.lead_axe_rate)]).toEqual([20, 7.5, 22.5]);
    expect(n(c.lead_referrer_payout)).toBe(75000); // 15% of the lead side's 500,000
    expect(n(c.lead_agent_payout)).toBe(200000);
  });

  it("uses the legacy schedule before 1 Sep 2026 (100% to Axe)", async () => {
    const c = await close({ leadModel: "company_direct", listModel: "company_direct", date: "2026-08-15" });
    expect([n(c.agent_total), n(c.axe_total)]).toEqual([0, 1000000]);
  });

  it("refuses an unbalanced save from the app unless a reason is given", async () => {
    await expect(as(db, ADMIN(), () => db.query(
      `insert into public.closings (closing_date, deal_type, our_commission, commission_currency) values ('2026-12-15', 'sale', 900000, 'LKR')`,
    ))).rejects.toThrow(/doesn't balance/);
    const ok = await as(db, ADMIN(), () => db.query(
      `insert into public.closings (closing_date, deal_type, our_commission, commission_currency, split_override_reason)
       values ('2026-12-15', 'sale', 900000, 'LKR', 'Legacy deal, sides not recorded') returning id`,
    ));
    expect(ok.rows).toHaveLength(1);
  });

  async function sided(opts: { lead: number | null; listing: number | null; listModel: string; leadModel?: string; partnerPct?: number }) {
    const pid = (await db.query<{ id: string }>("insert into public.referral_partners (full_name, referral_rate_pct) values ('Ref Pct', $1) returning id", [opts.partnerPct ?? 15])).rows[0].id;
    const leadModel = opts.leadModel ?? "company_direct";
    const l = await lead({ sourcing_model: leadModel, referral_partner_id: leadModel.includes("referrer") ? pid : null });
    const p = await property({ sourcing_model: opts.listModel, referral_partner_id: opts.listModel.includes("referrer") ? pid : null });
    const { rows } = await as(db, ADMIN(), () => db.query<Row>(
      `insert into public.closings (closing_date, deal_type, lead_id, property_id, lead_side_agent_id, listing_side_agent_id,
         lead_side_commission, listing_side_commission, our_commission, commission_currency)
       values ('2026-12-15', 'rental', $1, $2, $3, $4, $5, $6, 1, 'LKR') returning *`,
      [l, p, sabry.agentId, anuk.agentId, opts.lead, opts.listing]));
    return { c: rows[0], pid };
  }

  it("Adhith's example: 325,000 (162,500 each side), landlord referred -> 15% of the landlord side only", async () => {
    const { c } = await sided({ lead: 162500, listing: 162500, listModel: "company_via_referrer" });
    expect(n(c.our_commission)).toBe(325000);
    expect(n(c.listing_referrer_payout)).toBe(24375);
    expect(n(c.lead_referrer_payout)).toBe(0);
    expect([n(c.listing_agent_payout), n(c.listing_axe_payout)]).toEqual([56875, 81250]);
    expect([n(c.lead_agent_payout), n(c.lead_axe_payout)]).toEqual([56875, 105625]);
    expect(n(c.split_delta)).toBe(0);
  });

  it("uses the partner's own negotiated rate", async () => {
    const { c } = await sided({ lead: 162500, listing: 162500, listModel: "company_via_referrer", partnerPct: 10 });
    expect(n(c.listing_referrer_rate)).toBe(5);
    expect(n(c.listing_referrer_payout)).toBe(16250);
    expect(n(c.split_delta)).toBe(0);
  });

  it("unequal sides: each side's shares come from that side's own commission", async () => {
    const { c } = await sided({ lead: 100000, listing: 0, listModel: "company_direct" });
    expect(n(c.our_commission)).toBe(100000);
    expect([n(c.lead_agent_payout), n(c.listing_agent_payout), n(c.axe_total)]).toEqual([35000, 0, 65000]);
  });

  it("keeps the rate fixed on the closing when the partner's rate changes later", async () => {
    const { c, pid } = await sided({ lead: 162500, listing: 162500, listModel: "company_via_referrer", partnerPct: 10 });
    await db.query("update public.referral_partners set referral_rate_pct = 15 where id = $1", [pid]);
    const { rows } = await as(db, ADMIN(), () => db.query<Row>("update public.closings set notes = 'edited' where id = $1 returning *", [c.id]));
    expect(n(rows[0].listing_referrer_payout)).toBe(16250);
  });

  it("converts to USD at the closing's rate", async () => {
    const c = await close({ leadModel: "company_direct", listModel: "company_direct" });
    expect(n(c.monthly_rent_usd)).toBeCloseTo(3333.33, 2);
    expect(n(c.rent_per_sqft_usd)).toBeCloseTo(3.3333, 3);
  });
});

describe("what a closing does (7.2)", () => {
  it("marks the property Rented with its next available date, the lead Closed Won, and schedules payouts", async () => {
    const l = await lead({ sourcing_model: "company_direct", assigned_agent_id: sabry.agentId });
    const p = await property({ sourcing_model: "agent_self_sourced", website_published: false });
    await as(db, ADMIN(), () => db.query(
      `insert into public.closings (closing_date, deal_type, lead_id, property_id, lead_side_agent_id, listing_side_agent_id,
         our_commission, commission_currency, lease_end_date) values ('2026-12-15', 'rental', $1, $2, $3, $4, 1000000, 'LKR', '2027-12-14')`,
      [l, p, sabry.agentId, anuk.agentId]));
    const prop = await db.query<{ status: string; next_available_date: string }>("select status, next_available_date::text from public.properties where id = $1", [p]);
    expect(prop.rows[0]).toEqual({ status: "rented", next_available_date: "2027-12-14" });
    expect(await stage(l)).toBe("closed_won");
    const pay = await db.query<{ payee_agent_id: string; amount: string; due_date: string }>(
      "select payee_agent_id, amount, due_date::text from public.commission_payouts p join public.closings c on c.id = p.closing_id where c.lead_id = $1 order by side", [l]);
    expect(pay.rows.map((r) => [r.payee_agent_id, Number(r.amount), r.due_date])).toEqual([
      [sabry.agentId, 175000, "2026-12-20"],
      [anuk.agentId, 250000, "2026-12-20"],
    ]);
    const flag = await db.query("select 1 from public.notifications where kind = 'gate_skipped'");
    expect(flag.rows.length).toBeGreaterThan(0); // the lead was at New, not Documentation Ready
  });

  it("a sale marks the property Sold", async () => {
    const p = await property({ sourcing_model: "company_direct" });
    await as(db, ADMIN(), () => db.query(
      `insert into public.closings (closing_date, deal_type, property_id, our_commission, commission_currency, lead_sourcing_model)
       values ('2026-12-15', 'sale', $1, 3000000, 'LKR', 'company_direct')`, [p]));
    const prop = await db.query<{ status: string }>("select status from public.properties where id = $1", [p]);
    expect(prop.rows[0].status).toBe("sold");
  });

  it("leaves imported history alone: an Airtable closing doesn't touch today's property or lead", async () => {
    const l = await lead({ pipeline_status: "contacted" });
    const p = await property({ sourcing_model: "company_direct", status: "available" });
    await db.query(
      `insert into public.closings (closing_date, deal_type, lead_id, property_id, our_commission, commission_currency, airtable_id)
       values ('2025-03-01', 'rental', $1, $2, 500000, 'LKR', 'recIMPORT1')`, [l, p]);
    const prop = await db.query<{ status: string }>("select status from public.properties where id = $1", [p]);
    expect(prop.rows[0].status).toBe("available");
    expect(await stage(l)).toBe("contacted");
  });

  it("keeps closings away from agents, but tells them their own closing count", async () => {
    const { rows } = await as(db, AGENT(), () => db.query<{ n: string }>("select public.my_closings_count('2026-12-01', '2026-12-31') n"));
    expect(Number(rows[0].n)).toBeGreaterThan(0);
    const c = await as(db, AGENT(), () => db.query("select * from public.closings"));
    expect(c.rows).toHaveLength(0);
  });
});
