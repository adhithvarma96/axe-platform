// Phase 0 acceptance tests (SPEC 16):
//  - an Agent cannot read closings or commission data, even calling the API directly
//  - the audit log captures before/after on every table
// plus the other foundations: RLS everywhere, roles, 2FA for Super Admin,
// soft deletes, frozen IDs, forward-only commission schedules.
import { beforeAll, describe, expect, it } from "vitest";
import { as, freshDb, makeUser, refused, type Db } from "./harness";

let db: Db;
let admin: { uid: string; agentId: string };
let agent: { uid: string; agentId: string };
let dataEntry: { uid: string; agentId: string };
let closingId: string;

const ADMIN = () => ({ role: "authenticated" as const, sub: admin.uid, aal: "aal2" as const });
const ADMIN_NO_2FA = () => ({ role: "authenticated" as const, sub: admin.uid, aal: "aal1" as const });
const AGENT = () => ({ role: "authenticated" as const, sub: agent.uid });
const DATA_ENTRY = () => ({ role: "authenticated" as const, sub: dataEntry.uid });
const ANON = { role: "anon" as const };

const MONEY_TABLES = [
  "closings",
  "commission_receipts",
  "commission_payouts",
  "commission_schedules",
  "commission_schedule_rates",
  "company_targets",
  "agent_hr",
  "referral_partner_private",
  "audit_log",
];

beforeAll(async () => {
  db = await freshDb();
  admin = await makeUser(db, "super_admin", "Adhith Chandrasekar");
  agent = await makeUser(db, "agent", "Sabry");
  dataEntry = await makeUser(db, "data_entry", "Dushan");

  const { rows } = await db.query<{ id: string }>(
    `insert into public.closings (closing_date, deal_type, our_commission, commission_currency, lead_side_agent_id,
       commission_schedule_id)
     values ('2026-10-15', 'rental', 1500, 'USD', $1, (select id from public.commission_schedules where version = '1.0'))
     returning id`,
    [agent.agentId],
  );
  closingId = rows[0].id;
  await db.query(
    `insert into public.commission_receipts (closing_id, received_on, amount, currency, method, usd_lkr_rate, received_into)
     values ($1, '2026-10-20', 1000, 'USD', 'bank_transfer', 300, 'Company current account')`,
    [closingId],
  );
  await db.query("insert into public.agent_hr (agent_id, personal_phone) values ($1, '+94 77 000 0000')", [agent.agentId]);
}, 60_000);

describe("schema foundations", () => {
  it("has row-level security switched on for every table", async () => {
    const { rows } = await db.query<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(rows.map((r) => r.relname)).toEqual([]);
  });

  it("has an audit trigger on every table except the audit log itself", async () => {
    const { rows } = await db.query<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'audit_log'
         and not exists (select 1 from pg_trigger t where t.tgrelid = c.oid and t.tgname = 'z90_audit')`,
    );
    expect(rows.map((r) => r.relname)).toEqual([]);
  });

  it("gives every table a permission row for every role it should reach", async () => {
    const { rows } = await db.query<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r'
         and not exists (select 1 from public.role_permissions rp where rp.resource = c.relname and rp.role = 'super_admin')`,
    );
    expect(rows.map((r) => r.relname)).toEqual([]);
  });

  it("seeds Schedule A v1.0 with every side summing to 50 points", async () => {
    const { rows } = await db.query<{ n: number }>(
      `select count(*)::int as n from public.commission_schedule_rates r
       join public.commission_schedules s on s.id = r.schedule_id where s.version = '1.0'`,
    );
    expect(rows[0].n).toBe(8);
    const probation = await db.query<{ agent_rate: string }>(
      `select agent_rate from public.commission_schedule_rates r join public.commission_schedules s on s.id = r.schedule_id
       where s.version = '1.0' and sourcing_model = 'agent_self_sourced' and tenure = 'probation'`,
    );
    expect(Number(probation.rows[0].agent_rate)).toBe(25); // self-sourced stays 25 during probation
  });

  it("seeds the LKR 10M monthly revenue target", async () => {
    const { rows } = await db.query<{ v: string }>("select target_value as v from public.company_targets");
    expect(Number(rows[0].v)).toBe(10_000_000);
  });
});

describe("an Agent cannot see money, even calling the API directly", () => {
  for (const table of MONEY_TABLES) {
    it(`reads zero rows from ${table}`, async () => {
      const { rows } = await as(db, AGENT(), () => db.query(`select * from public.${table}`));
      expect(rows).toHaveLength(0);
    });
  }

  it("cannot create a closing", async () => {
    const msg = await refused(
      as(db, AGENT(), () =>
        db.query("insert into public.closings (closing_date, deal_type) values ('2026-11-01', 'sale')"),
      ),
    );
    expect(msg).toMatch(/row-level security/);
  });

  it("cannot change a closing", async () => {
    await as(db, AGENT(), () =>
      db.query("update public.closings set our_commission = 1 where id = $1", [closingId]),
    );
    const { rows } = await db.query<{ c: string }>("select our_commission as c from public.closings where id = $1", [closingId]);
    expect(Number(rows[0].c)).toBe(1500);
  });

  it("cannot read the audit log", async () => {
    const { rows } = await as(db, AGENT(), () => db.query("select * from public.audit_log"));
    expect(rows).toHaveLength(0);
  });

  it("cannot change role permissions to grant itself access", async () => {
    await refused(
      as(db, AGENT(), () =>
        db.query("insert into public.role_permissions values ('agent', 'closings', true, true, true, true)"),
      ),
    );
    const res = await as(db, AGENT(), () =>
      db.query("update public.role_permissions set can_select = true where role = 'agent' and resource = 'closings'"),
    );
    expect(res.affectedRows ?? 0).toBe(0);
  });

  it("cannot promote itself to Super Admin", async () => {
    await as(db, AGENT(), () => db.query("update public.agents set role = 'super_admin' where id = $1", [agent.agentId]));
    const { rows } = await db.query<{ role: string }>("select role from public.agents where id = $1", [agent.agentId]);
    expect(rows[0].role).toBe("agent");
  });

  it("can still see its own targets and the team list", async () => {
    await db.query(
      `insert into public.agent_targets (agent_id, metric, period, target_value, effective_from)
       values ($1, 'viewings', 'week', 10, '2026-09-01'), ($2, 'viewings', 'week', 99, '2026-09-01')`,
      [agent.agentId, admin.agentId],
    );
    const targets = await as(db, AGENT(), () => db.query<{ target_value: string }>("select target_value from public.agent_targets"));
    expect(targets.rows.map((r) => Number(r.target_value))).toEqual([10]);
    const team = await as(db, AGENT(), () => db.query("select full_name from public.agents"));
    expect(team.rows.length).toBe(3);
  });
});

describe("Super Admin", () => {
  it("sees closings and commission receipts once 2FA is verified", async () => {
    const closings = await as(db, ADMIN(), () => db.query("select * from public.closings"));
    expect(closings.rows).toHaveLength(1);
    const receipts = await as(db, ADMIN(), () => db.query("select * from public.commission_receipts"));
    expect(receipts.rows).toHaveLength(1);
  });

  it("sees nothing at all without 2FA", async () => {
    const closings = await as(db, ADMIN_NO_2FA(), () => db.query("select * from public.closings"));
    expect(closings.rows).toHaveLength(0);
    const props = await as(db, ADMIN_NO_2FA(), () => db.query("select * from public.properties"));
    expect(props.rows).toHaveLength(0);
  });
});

describe("the public website role (anon) gets nothing from the tables", () => {
  for (const table of ["properties", "owners", "leads", "closings", "agents"]) {
    it(`is denied ${table}`, async () => {
      const msg = await refused(as(db, ANON, () => db.query(`select * from public.${table}`)));
      expect(msg).toMatch(/permission denied/);
    });
  }
});

describe("Data Entry", () => {
  it("can add a property but cannot see closings", async () => {
    const { rows } = await as(db, DATA_ENTRY(), () =>
      db.query<{ listing_no: string }>(
        "insert into public.properties (property_type, beds) values ('apartment', 2) returning listing_no",
      ),
    );
    expect(rows[0].listing_no).toMatch(/^AX\d{6}$/);
    const closings = await as(db, DATA_ENTRY(), () => db.query("select * from public.closings"));
    expect(closings.rows).toHaveLength(0);
  });
});

describe("audit log", () => {
  it("records create, update (before/after), soft delete and restore with who did it", async () => {
    const { rows } = await as(db, AGENT(), () =>
      db.query<{ id: string }>(
        "insert into public.properties (property_type, asking_rent, rent_currency) values ('apartment', 1800, 'USD') returning id",
      ),
    );
    const id = rows[0].id;
    await as(db, AGENT(), () => db.query("update public.properties set asking_rent = 2000 where id = $1", [id]));
    await as(db, ADMIN(), () => db.query("update public.properties set deleted_at = now() where id = $1", [id]));
    await as(db, ADMIN(), () => db.query("update public.properties set deleted_at = null where id = $1", [id]));

    const log = await db.query<{ action: string; changed_by: string; before: { asking_rent: number } | null; after: { asking_rent: number } | null }>(
      "select action, changed_by, before, after from public.audit_log where table_name = 'properties' and record_id = $1 order by id",
      [id],
    );
    expect(log.rows.map((r) => r.action)).toEqual(["create", "update", "delete", "restore"]);
    expect(log.rows[0].changed_by).toBe(agent.uid);
    expect(Number(log.rows[1].before?.asking_rent)).toBe(1800);
    expect(Number(log.rows[1].after?.asking_rent)).toBe(2000);
    expect(log.rows[2].changed_by).toBe(admin.uid);

    const prices = await db.query("select * from public.price_history where property_id = $1", [id]);
    expect(prices.rows).toHaveLength(1);
  });

  it("captures before/after on every kind of table, including join tables and settings", async () => {
    await as(db, ADMIN(), () => db.query("update public.settings set value = '48' where key = 'edit_window_hours'"));
    const { rows } = await db.query<{ record_id: string; before: { value: number }; after: { value: number } }>(
      "select record_id, before, after from public.audit_log where table_name = 'settings' and action = 'update'",
    );
    expect(rows[0].record_id).toBe("edit_window_hours");
    expect(rows[0].before.value).toBe(24);
    expect(rows[0].after.value).toBe(48);
  });

  it("cannot be written or edited through the API, even by a Super Admin", async () => {
    await refused(
      as(db, ADMIN(), () =>
        db.query("insert into public.audit_log (table_name, record_id, action) values ('x', 'y', 'create')"),
      ),
    );
    await refused(as(db, ADMIN(), () => db.query("delete from public.audit_log")));
  });
});

describe("soft deletes", () => {
  it("only a Super Admin can delete; agents are refused", async () => {
    const { rows } = await as(db, AGENT(), () =>
      db.query<{ id: string }>("insert into public.owners (name) values ('Owner A') returning id"),
    );
    const msg = await refused(
      as(db, AGENT(), () => db.query("update public.owners set deleted_at = now() where id = $1", [rows[0].id])),
    );
    expect(msg).toMatch(/Super Admin/);
    const hard = await as(db, AGENT(), () => db.query("delete from public.owners where id = $1", [rows[0].id]));
    expect(hard.affectedRows ?? 0).toBe(0);
  });

  it("hides soft-deleted rows from agents but not from the Super Admin", async () => {
    const { rows } = await db.query<{ id: string }>(
      "insert into public.owners (name, deleted_at) values ('Deleted owner', now()) returning id",
    );
    const agentView = await as(db, AGENT(), () => db.query("select * from public.owners where id = $1", [rows[0].id]));
    expect(agentView.rows).toHaveLength(0);
    const adminView = await as(db, ADMIN(), () => db.query("select * from public.owners where id = $1", [rows[0].id]));
    expect(adminView.rows).toHaveLength(1);
  });
});

describe("frozen IDs (7.1)", () => {
  it("generates AX/AXH/AXL/AXV/AXCP + year + shared sequence, and ARLD for leads", async () => {
    const { rows } = await db.query<{ listing_no: string; property_type: string }>(
      `insert into public.properties (property_type, created_at) values
         ('house', '2026-11-05'), ('land', '2026-11-05'), ('villa', '2026-11-05'), ('commercial', '2027-01-02')
       returning listing_no, property_type`,
    );
    expect(rows[0].listing_no).toMatch(/^AXH26\d{4}$/);
    expect(rows[1].listing_no).toMatch(/^AXL26\d{4}$/);
    expect(rows[2].listing_no).toMatch(/^AXV26\d{4}$/);
    expect(rows[3].listing_no).toMatch(/^AXCP27\d{4}$/);
    const lead = await db.query<{ lead_code: string }>(
      "insert into public.leads (name, created_at) values ('Lead', '2026-11-05') returning lead_code",
    );
    expect(lead.rows[0].lead_code).toMatch(/^ARLD26\d{4}$/);
  });

  it("keeps migrated codes exactly and moves the sequence past them", async () => {
    await db.query(
      "insert into public.properties (property_type, listing_no, seq_no) values ('apartment', 'AX25063', 9063)",
    );
    await db.query("select app.sync_sequences()");
    const { rows } = await db.query<{ listing_no: string }>(
      "insert into public.properties (property_type, created_at) values ('apartment', '2026-11-05') returning listing_no",
    );
    expect(rows[0].listing_no).toBe("AX269064");
  });

  it("refuses to change a listing number, even for the Super Admin", async () => {
    const msg = await refused(
      as(db, ADMIN(), () => db.query("update public.properties set listing_no = 'AX99' where listing_no = 'AX25063'")),
    );
    expect(msg).toMatch(/frozen/);
  });
});

describe("other data rules", () => {
  it("only a Super Admin can set a property's commission structure", async () => {
    const msg = await refused(
      as(db, AGENT(), () =>
        db.query("insert into public.properties (property_type, commission_structure) values ('apartment', '1 month')"),
      ),
    );
    expect(msg).toMatch(/commission structure/);
  });

  it("requires a referral partner on via-referrer sourcing", async () => {
    const msg = await refused(
      db.query("insert into public.leads (name, sourcing_model) values ('X', 'company_via_referrer')"),
    );
    expect(msg).toMatch(/leads_referrer_required/);
  });

  it("requires a receiver on cash commission receipts", async () => {
    const msg = await refused(
      db.query(
        `insert into public.commission_receipts (closing_id, received_on, amount, currency, method, usd_lkr_rate)
         values ($1, '2026-10-21', 500, 'USD', 'cash', 300)`,
        [closingId],
      ),
    );
    expect(msg).toMatch(/receipts_cash_needs_receiver/);
  });

  it("refuses to edit a commission schedule that has closings against it", async () => {
    const msg = await refused(
      as(db, ADMIN(), () =>
        db.query(
          `update public.commission_schedule_rates set agent_rate = 20, axe_rate = 12.5
           where sourcing_model = 'company_direct' and tenure = 'confirmed'
             and schedule_id = (select id from public.commission_schedules where version = '1.0')`,
        ),
      ),
    );
    expect(msg).toMatch(/new version/);
  });

  it("records every pipeline move in stage history", async () => {
    const { rows } = await db.query<{ id: string }>("insert into public.leads (name) values ('Mover') returning id");
    await db.query("update public.leads set pipeline_status = 'contacted' where id = $1", [rows[0].id]);
    const hist = await db.query<{ from_status: string | null; to_status: string }>(
      "select from_status, to_status from public.lead_stage_history where lead_id = $1 order by changed_at, from_status nulls first",
      [rows[0].id],
    );
    expect(hist.rows).toEqual([
      { from_status: null, to_status: "new" },
      { from_status: "new", to_status: "contacted" },
    ]);
  });
});

describe("team terms are hidden from agents", () => {
  it("keeps join date, probation end and commission-exempt in Super Admin-only HR details", async () => {
    await db.query(
      `insert into public.agent_hr (agent_id, date_joined, probation_end_date, commission_exempt)
       values ($1, '2026-09-01', '2026-11-30', false)
       on conflict (agent_id) do update set date_joined = excluded.date_joined, probation_end_date = excluded.probation_end_date`,
      [agent.agentId],
    );
    const cols = await as(db, AGENT(), () => db.query("select * from public.agents limit 1"));
    expect(cols.fields.map((f) => f.name)).not.toContain("probation_end_date");
    expect(cols.fields.map((f) => f.name)).not.toContain("commission_exempt");
    const hr = await as(db, AGENT(), () => db.query("select * from public.agent_hr"));
    expect(hr.rows).toHaveLength(0);
    const adminHr = await as(db, ADMIN(), () => db.query("select probation_end_date from public.agent_hr where agent_id = $1", [agent.agentId]));
    expect(adminHr.rows).toHaveLength(1);
  });
});

describe("Data Entry and leads", () => {
  it("can view and add leads, but not edit them", async () => {
    const { rows } = await as(db, DATA_ENTRY(), () =>
      db.query<{ id: string; lead_code: string }>("insert into public.leads (name) values ('Walk-in enquiry') returning id, lead_code"),
    );
    expect(rows[0].lead_code).toMatch(/^ARLD\d{6}$/);
    const seen = await as(db, DATA_ENTRY(), () => db.query("select id from public.leads where id = $1", [rows[0].id]));
    expect(seen.rows).toHaveLength(1);
    const upd = await as(db, DATA_ENTRY(), () =>
      db.query("update public.leads set pipeline_status = 'contacted' where id = $1", [rows[0].id]),
    );
    expect(upd.affectedRows ?? 0).toBe(0);
    const viewings = await as(db, DATA_ENTRY(), () => db.query("select * from public.viewings"));
    expect(viewings.rows).toHaveLength(0);
  });
});

describe("central USD/LKR rate", () => {
  it("uses the latest automatic rate, and a manual override wins until it ends", async () => {
    await db.query(
      `insert into public.fx_rates (rate_date, usd_lkr, source, provider) values
         ('2026-11-01', 300.10, 'auto', 'test'), ('2026-11-04', 301.50, 'auto', 'test')`,
    );
    const auto = await db.query<{ r: string }>("select app.usd_lkr_on('2026-11-05') as r");
    expect(Number(auto.rows[0].r)).toBe(301.5);
    const older = await db.query<{ r: string }>("select app.usd_lkr_on('2026-11-02') as r");
    expect(Number(older.rows[0].r)).toBe(300.1);

    await as(db, ADMIN(), () =>
      db.query("insert into public.fx_rates (rate_date, usd_lkr, source, pinned_until) values ('2026-11-05', 305, 'manual', '2026-11-10')"),
    );
    const pinned = await db.query<{ r: string }>("select app.usd_lkr_on('2026-11-07') as r");
    expect(Number(pinned.rows[0].r)).toBe(305);
    const after = await db.query<{ r: string }>("select app.usd_lkr_on('2026-11-11') as r");
    expect(Number(after.rows[0].r)).toBe(301.5);

    const lkr = await db.query<{ v: string }>("select app.to_lkr(1500, 'USD', '2026-11-07') as v");
    expect(Number(lkr.rows[0].v)).toBe(457500);
  });

  it("fills a receipt's rate from the central rate, but keeps a typed-in rate", async () => {
    const { rows } = await db.query<{ usd_lkr_rate: string }>(
      `insert into public.commission_receipts (closing_id, received_on, amount, currency, method, received_into)
       values ($1, '2026-11-04', 200000, 'LKR', 'bank_transfer', 'Company current account') returning usd_lkr_rate`,
      [closingId],
    );
    expect(Number(rows[0].usd_lkr_rate)).toBe(301.5);
    const typed = await db.query<{ usd_lkr_rate: string }>(
      `insert into public.commission_receipts (closing_id, received_on, amount, currency, method, usd_lkr_rate, received_into)
       values ($1, '2026-11-04', 100, 'USD', 'bank_transfer', 299, 'Company USD account') returning usd_lkr_rate`,
      [closingId],
    );
    expect(Number(typed.rows[0].usd_lkr_rate)).toBe(299);
  });

  it("refuses a receipt dated before any stored rate unless a rate is typed in", async () => {
    const msg = await refused(
      db.query(
        `insert into public.commission_receipts (closing_id, received_on, amount, currency, method, received_into)
         values ($1, '2025-01-01', 100, 'USD', 'bank_transfer', 'x')`,
        [closingId],
      ),
    );
    expect(msg).toMatch(/No USD\/LKR rate/);
  });

  it("lets everyone read the rate but only a Super Admin change it", async () => {
    const read = await as(db, AGENT(), () => db.query("select * from public.fx_rates"));
    expect(read.rows.length).toBeGreaterThan(0);
    await refused(
      as(db, AGENT(), () => db.query("insert into public.fx_rates (rate_date, usd_lkr, source) values ('2026-11-06', 305, 'manual')")),
    );
  });
});

describe("import helpers", () => {
  it("only the service role can move the record counters", async () => {
    await refused(as(db, AGENT(), () => db.query("select public.admin_sync_sequences()")));
    await refused(as(db, ADMIN(), () => db.query("select public.admin_sync_sequences()")));
    await refused(as(db, ANON, () => db.query("select public.admin_sync_sequences()")));
    await db.exec("set role service_role");
    try { await db.query("select public.admin_sync_sequences()"); } finally { await db.exec("reset role"); }
  });
});

describe("public website allow-list", () => {
  const ALLOWED = [
    "listing_no", "slug", "property_type", "status", "listing_types", "condition", "beds", "baths", "parking",
    "square_feet", "furnished", "price_on_request", "asking_rent", "rent_currency", "asking_sale_price", "sale_currency",
    "rent_usd", "rent_lkr", "sale_usd", "sale_lkr", "available_from", "public_notes", "land_extent_perches",
    "built_up_area_sqft", "number_of_floors", "garden", "pool", "sea_view", "total_floor_area_sqft",
    "commercial_sub_category", "location_name", "location_slug", "market_tier", "development_name",
    "development_slug", "features", "cover", "photos", "agent_name", "agent_whatsapp", "published_at", "updated_at",
  ].sort();
  let pubId: string;

  beforeAll(async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into public.properties (property_type, status, listing_types, beds, asking_rent, rent_currency, unit_number, floor,
         commission_structure, internal_notes, map_pin, website_published, public_notes)
       values ('apartment', 'available', '{rent_long_term}', 2, 2000, 'USD', '12A', '12', '1 month', 'owner is difficult',
         'https://maps.example/x', true, 'Bright corner unit') returning id`,
    );
    pubId = rows[0].id;
    await db.query(
      `insert into public.property_photos (property_id, storage_path, source, source_ref, sort_order, is_cover, is_public, variants)
       values ($1, 'p/x', 'upload', 'a', 0, true, true, '{"400":{"key":"properties/x/400.webp","url":"https://cdn/x/400.webp","width":400,"height":300,"bytes":9}}'),
              ($1, 'p/y', 'upload', 'b', 1, false, false, '{"400":{"key":"properties/y/400.webp","url":"https://cdn/y/400.webp","width":400,"height":300,"bytes":9}}')`,
      [pubId],
    );
    // an unpublished and a rented listing must not appear
    await db.query("insert into public.properties (property_type, status, website_published) values ('apartment','available',false), ('apartment','rented',true)");
  });

  it("exposes exactly the allow-listed columns, nothing internal", async () => {
    const { fields } = await as(db, ANON, () => db.query("select * from public.web_listings limit 1"));
    expect(fields.map((f) => f.name).sort()).toEqual(ALLOWED);
  });

  it("shows only published Available/Reserved listings", async () => {
    const { rows } = await as(db, ANON, () => db.query<{ listing_no: string }>("select listing_no from public.web_listings"));
    expect(rows).toHaveLength(1);
  });

  it("never leaks internal values anywhere in the row, and hides private photos and storage keys", async () => {
    const { rows } = await as(db, ANON, () => db.query("select * from public.web_listings"));
    const text = JSON.stringify(rows[0]);
    for (const secret of ["12A", "1 month", "owner is difficult", "maps.example", "properties/x/400.webp", "cdn/y/"]) {
      expect(text, secret).not.toContain(secret);
    }
    expect(text).toContain("https://cdn/x/400.webp");
  });

  it("hides the price when Price on request is ticked", async () => {
    await db.query("update public.properties set price_on_request = true where id = $1", [pubId]);
    const { rows } = await as(db, ANON, () => db.query<{ asking_rent: string | null; rent_usd: string | null }>("select asking_rent, rent_usd from public.web_listings"));
    expect(rows[0]).toEqual({ asking_rent: null, rent_usd: null });
    await db.query("update public.properties set price_on_request = false where id = $1", [pubId]);
  });

  it("still denies the website every table", async () => {
    for (const t of ["properties", "property_photos", "owners", "fx_rates"]) {
      await refused(as(db, ANON, () => db.query(`select 1 from public.${t} limit 1`)));
    }
  });

  it("opens a gallery only with the right token, and only while enabled", async () => {
    const { rows } = await db.query<{ gallery_token: string }>("select gallery_token from public.properties where id = $1", [pubId]);
    const token = rows[0].gallery_token;
    expect(token).toMatch(/^[0-9a-f]{24}$/);
    const ok = await as(db, ANON, () => db.query<{ g: { photos: unknown[]; listing_no: string } }>("select public.web_gallery($1) as g", [token]));
    expect(ok.rows[0].g.photos).toHaveLength(1);
    expect(JSON.stringify(ok.rows[0].g)).not.toMatch(/12A|1 month|owner is difficult/);
    const wrong = await as(db, ANON, () => db.query<{ g: unknown }>("select public.web_gallery($1) as g", ["0".repeat(24)]));
    expect(wrong.rows[0].g).toBeNull();
    await db.query("update public.properties set gallery_enabled = false where id = $1", [pubId]);
    const off = await as(db, ANON, () => db.query<{ g: unknown }>("select public.web_gallery($1) as g", [token]));
    expect(off.rows[0].g).toBeNull();
  });
});

describe("price guide", () => {
  it("publishes only rounded brackets, and only with at least 4 apartments behind them", async () => {
    const { rows: loc } = await db.query<{ id: string }>(
      "insert into public.locations (name, slug) values ('Guide Town', 'guide-town') returning id",
    );
    const add = (rent: number) => db.query(
      `insert into public.properties (property_type, status, listing_types, asking_rent, rent_currency, square_feet, location_id)
       values ('apartment', 'rented', '{rent_long_term}', $1, 'USD', 1000, $2)`, [rent, loc[0].id],
    );
    for (const r of [1510, 1990, 2420]) await add(r);
    const three = await as(db, ANON, () => db.query("select * from public.web_price_guide where slug = 'guide-town'"));
    expect(three.rows).toHaveLength(0); // 3 apartments: no bracket

    await add(3070);
    const { rows, fields } = await as(db, ANON, () => db.query<Record<string, string | number | null>>(
      "select * from public.web_price_guide where slug = 'guide-town'",
    ));
    expect(fields.map((f) => f.name).sort()).toEqual(
      ["rent_psf_high", "rent_psf_low", "rent_usd_high", "rent_usd_low", "sale_lkr_high", "sale_lkr_low", "scope", "slug"],
    );
    const g = rows[0];
    expect(g.scope).toBe("location");
    expect(Number(g.rent_usd_low) % 100).toBe(0);
    expect(Number(g.rent_usd_high) % 100).toBe(0);
    expect(Number(g.rent_usd_low)).toBeGreaterThanOrEqual(1500);
    expect(Number(g.rent_usd_high)).toBeLessThanOrEqual(3100);
    expect(g.sale_lkr_low).toBeNull(); // no sale prices
    for (const exact of ["1510", "1990", "2420", "3070"]) expect(JSON.stringify(rows)).not.toContain(exact);
  });
});

describe("website property types", () => {
  it("shows only apartments until the setting allows other types", async () => {
    await db.query(
      `insert into public.properties (property_type, status, listing_types, asking_sale_price, sale_currency, website_published, listing_no, seq_no)
       values ('house', 'available', '{sale}', 90000000, 'LKR', true, 'AXH-TEST-1', 99001)`,
    );
    const before = await as(db, ANON, () => db.query("select 1 from public.web_listings where listing_no = 'AXH-TEST-1'"));
    expect(before.rows).toHaveLength(0);
    await db.query(`update public.settings set value = '["apartment","house"]' where key = 'website_property_types'`);
    const after = await as(db, ANON, () => db.query("select 1 from public.web_listings where listing_no = 'AXH-TEST-1'"));
    expect(after.rows).toHaveLength(1);
    await db.query(`update public.settings set value = '["apartment"]' where key = 'website_property_types'`);
  });
});
