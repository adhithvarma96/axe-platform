// Test harness: runs every Supabase migration against an in-process Postgres
// (PGlite) with a minimal stand-in for Supabase Auth, then lets tests act as a
// given user, exactly as PostgREST would (SET ROLE + JWT claims).
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS = join(__dirname, "..", "..", "supabase", "migrations");

// Mirrors what Supabase provides: roles, auth.users, auth.uid(), auth.jwt().
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
  $$;
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(auth.jwt() ->> 'sub', '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on all functions in schema auth to anon, authenticated, service_role;
`;

export type Db = PGlite;

export async function freshDb(): Promise<Db> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(join(MIGRATIONS, file), "utf8").replace(/^﻿/, "");
    try {
      await db.exec(sql);
    } catch (e) {
      throw new Error(`Migration ${file} failed: ${(e as Error).message}`);
    }
  }
  return db;
}

export interface Actor {
  role: "anon" | "authenticated";
  sub?: string;
  aal?: "aal1" | "aal2";
}

/** Run fn as a given API caller; always resets back to the superuser. */
export async function as<T>(db: Db, actor: Actor, fn: () => Promise<T>): Promise<T> {
  const claims = JSON.stringify({ sub: actor.sub, role: actor.role, aal: actor.aal ?? "aal1" });
  await db.query("select set_config('request.jwt.claims', $1, false)", [claims]);
  await db.exec(`set role ${actor.role}`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claims', '', false)");
  }
}

let n = 0;
/** Creates an auth user plus an agent record; returns the auth user id and agent id. */
export async function makeUser(db: Db, role: "super_admin" | "agent" | "data_entry" | "sales_manager", name?: string) {
  n += 1;
  const uid = crypto.randomUUID();
  await db.query("insert into auth.users (id, email) values ($1, $2)", [uid, `user${n}@axerealty.lk`]);
  const { rows } = await db.query<{ id: string }>(
    "insert into public.agents (user_id, full_name, role, work_email) values ($1, $2, $3, $4) returning id",
    [uid, name ?? `${role} ${n}`, role, `user${n}@axerealty.lk`],
  );
  return { uid, agentId: rows[0].id };
}

/** Expect a statement to be refused (permission or RLS violation). */
export async function refused(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error("Expected the statement to be refused, but it succeeded");
}
