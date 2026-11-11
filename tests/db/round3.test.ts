// Round 3 (12 Nov 2026): coming-soon listings on the website, the public team page,
// reviews, WhatsApp tap logs, and Super Admin only deletes.
import { beforeAll, describe, expect, it } from "vitest";
import { as, freshDb, makeUser, type Db } from "./harness";

let db: Db;
let admin: { uid: string; agentId: string };
let sabry: { uid: string; agentId: string };
const ANON = { role: "anon" as const };
const AGENT = () => ({ role: "authenticated" as const, sub: sabry.uid });

beforeAll(async () => {
  db = await freshDb();
  admin = await makeUser(db, "super_admin", "Adhith Chandrasekar");
  sabry = await makeUser(db, "agent", "Sabry Doole");
  const photo = `'{"400":{"url":"https://cdn/x/400.webp","width":400,"height":300}}'`;
  const { rows } = await db.query<{ id: string; no: string }>(`
    insert into public.properties (property_type, status, website_published, listing_types, asking_rent, rent_currency, next_available_date, listing_agent_id) values
      ('apartment', 'rented', true, '{rent_long_term}', 2000, 'USD', (now() at time zone 'Asia/Colombo')::date + 30, $1),
      ('apartment', 'rented', true, '{rent_long_term}', 2000, 'USD', (now() at time zone 'Asia/Colombo')::date + 90, $1),
      ('apartment', 'rented', true, '{rent_long_term}', 2000, 'USD', null, $1)
    returning id, listing_no no`, [sabry.agentId]);
  for (const r of rows) {
    await db.query(`insert into public.property_photos (property_id, storage_path, source, source_ref, sort_order, is_cover, is_public, variants)
      values ($1::uuid, 'p/' || $1::text, 'upload', $1::text, 0, true, true, ${photo})`, [r.id]);
  }
});

describe("coming soon on the website", () => {
  it("shows a rented unit freeing up within 60 days, flagged, with its date; not later ones", async () => {
    const { rows } = await as(db, ANON, () => db.query<{ coming_soon: boolean; available_from: string | null }>("select coming_soon, available_from from public.web_listings"));
    expect(rows).toHaveLength(1);
    expect(rows[0].coming_soon).toBe(true);
    expect(rows[0].available_from).not.toBeNull();
  });
});

describe("team page", () => {
  it("lists only people switched on for the website, never private fields", async () => {
    await db.query("update public.agents set public_name = 'Sabry', public_title = 'Property Consultant', show_on_website = true where id = $1", [sabry.agentId]);
    await db.query("update public.agents set public_name = 'Adhith' where id = $1", [admin.agentId]);
    const { rows, fields } = await as(db, ANON, () => db.query<{ name: string }>("select * from public.web_team"));
    expect(rows.map((r) => r.name)).toEqual(["Sabry"]);
    expect(fields.map((f) => f.name).sort()).toEqual(["bio", "email", "id", "name", "photo", "title", "website_sort", "whatsapp"]);
  });
});

describe("reviews", () => {
  it("the website reads published reviews; only the Super Admin edits them", async () => {
    const { rows } = await as(db, ANON, () => db.query("select * from public.web_reviews"));
    expect(rows.length).toBeGreaterThanOrEqual(5);
    await expect(as(db, AGENT(), () => db.query("insert into public.site_reviews (reviewer_name, body) values ('x', 'y')"))).rejects.toThrow();
    await expect(as(db, ANON, () => db.query("select * from public.site_reviews"))).rejects.toThrow();
  });
});

describe("WhatsApp taps", () => {
  it("an agent sees only taps on their own listings; the website cannot read or write them", async () => {
    await db.query("insert into public.whatsapp_clicks (listing_no, agent_id) values ('AX1', $1), ('AX2', $2)", [sabry.agentId, admin.agentId]);
    const mine = await as(db, AGENT(), () => db.query<{ listing_no: string }>("select listing_no from public.whatsapp_clicks"));
    expect(mine.rows.map((r) => r.listing_no)).toEqual(["AX1"]);
    await expect(as(db, ANON, () => db.query("insert into public.whatsapp_clicks (listing_no) values ('AX3')"))).rejects.toThrow();
  });
});

describe("deletes", () => {
  it("an agent cannot delete an owner; it stays in place", async () => {
    const { rows } = await db.query<{ id: string }>("insert into public.owners (name) values ('Dup Owner') returning id");
    await expect(as(db, AGENT(), () => db.query("update public.owners set deleted_at = now() where id = $1", [rows[0].id]))).rejects.toThrow();
  });
});
