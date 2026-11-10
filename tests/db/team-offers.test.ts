// Targets (revenue hidden from agents), owner mandates, and offers (8.6: ref = lead code, -O2 on
// revisions, a sent offer ticks Gate 1).
import { beforeAll, describe, expect, it } from "vitest";
import { as, freshDb, makeUser, type Db } from "./harness";

let db: Db;
let admin: { uid: string; agentId: string };
let sabry: { uid: string; agentId: string };
const AGENT = () => ({ role: "authenticated" as const, sub: sabry.uid });

beforeAll(async () => {
  db = await freshDb();
  admin = await makeUser(db, "super_admin", "Adhith Chandrasekar");
  sabry = await makeUser(db, "agent", "Sabry Doole");
  await db.query(
    `insert into public.agent_targets (agent_id, metric, period, target_value, effective_from) values
     ($1, 'viewings', 'week', 10, '2026-01-01'), ($1, 'closings', 'month', 5, '2026-01-01'),
     ($1, 'revenue_lkr', 'month', 2000000, '2026-01-01')`, [sabry.agentId]);
});

describe("targets", () => {
  it("an agent sees their count targets but never their revenue target", async () => {
    const viaFn = await as(db, AGENT(), () => db.query<{ metric: string }>("select metric from public.my_targets() order by 1"));
    expect(viaFn.rows.map((r) => r.metric)).toEqual(["closings", "viewings"]);
    const viaTable = await as(db, AGENT(), () => db.query<{ metric: string }>("select metric from public.agent_targets order by 1"));
    expect(viaTable.rows.map((r) => r.metric)).toEqual(["closings", "viewings"]);
  });
  it("an agent cannot set targets", async () => {
    await expect(as(db, AGENT(), () => db.query(
      "insert into public.agent_targets (agent_id, metric, period, target_value, effective_from) values ($1, 'viewings', 'week', 1, '2026-01-01')",
      [sabry.agentId]))).rejects.toThrow();
  });
});

describe("owner mandates", () => {
  it("stamps the date whenever the mandate status changes", async () => {
    const { rows } = await db.query<{ id: string; at: string | null }>(
      "insert into public.owners (name, mandate_status) values ('Owner M', 'prospect') returning id, mandate_updated_at at");
    expect(rows[0].at).not.toBeNull();
    await as(db, AGENT(), () => db.query("update public.owners set mandate_status = 'assessment_booked' where id = $1", [rows[0].id]));
    const after = await db.query<{ s: string }>("select mandate_status s from public.owners where id = $1", [rows[0].id]);
    expect(after.rows[0].s).toBe("assessment_booked");
  });
});

describe("offers", () => {
  let leadId: string;
  beforeAll(async () => {
    const { rows } = await db.query<{ id: string }>("insert into public.leads (name, lead_code) values ('Offer lead', 'ARLD269001') returning id");
    leadId = rows[0].id;
  });

  it("uses the lead code as the ref and appends -O2 on a revision", async () => {
    const ins = () => as(db, AGENT(), () => db.query<{ ref: string; version: number }>(
      "insert into public.offers (lead_id, deal_type, valid_until) values ($1, 'rental', current_date + 3) returning ref, version", [leadId]));
    const first = await ins();
    expect(first.rows[0]).toMatchObject({ ref: "ARLD269001", version: 1 });
    const second = await ins();
    expect(second.rows[0]).toMatchObject({ ref: "ARLD269001-O2", version: 2 });
  });

  it("a draft does not tick Gate 1; marking it sent does", async () => {
    const ticks = async () => (await db.query("select 1 from public.lead_gate_ticks where lead_id = $1 and gate_item_key = 'gate1_offer_sent'", [leadId])).rows.length;
    expect(await ticks()).toBe(0);
    await as(db, AGENT(), () => db.query("update public.offers set status = 'sent' where lead_id = $1 and version = 1", [leadId]));
    const sent = await db.query<{ sent_at: string | null }>("select sent_at from public.offers where lead_id = $1 and version = 1", [leadId]);
    expect(sent.rows[0].sent_at).not.toBeNull();
    expect(await ticks()).toBe(1);
  });

  it("an agent cannot delete an offer", async () => {
    const r = await as(db, AGENT(), () => db.query("delete from public.offers where lead_id = $1", [leadId]));
    expect(r.affectedRows ?? 0).toBe(0);
  });
});
