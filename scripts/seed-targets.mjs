#!/usr/bin/env node
// Sales targets Adhith set on 10 Nov 2026, effective 1 November 2026. Safe to re-run: a target
// that is already in force with the same value is left alone. Run on staging now and on
// production at the data load (after migrate-airtable.mjs has created the agents).
//
//   node --env-file=.env.local scripts/seed-targets.mjs            # dry run
//   node --env-file=.env.local scripts/seed-targets.mjs --apply
//
// Later changes are made on the Team & targets page, which keeps the history.
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const FROM = "2026-11-01";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const TARGETS = {
  Anuk: { viewings: 10, properties_sourced: 5, closings: 3, revenue_lkr: 1_000_000 },
  Sabry: { viewings: 10, properties_sourced: 5, closings: 5, revenue_lkr: 2_000_000 },
};
const PERIOD = { viewings: "week", properties_sourced: "week", closings: "month", revenue_lkr: "month" };

for (const [first, metrics] of Object.entries(TARGETS)) {
  const { data: agents, error } = await db.from("agents").select("id, full_name").ilike("full_name", `${first}%`).is("deleted_at", null);
  if (error) throw error;
  if (agents.length !== 1) { console.log(`${first}: expected one agent, found ${agents.length}; skipped`); continue; }
  const agent = agents[0];
  const { data: current, error: e2 } = await db.from("agent_targets").select("metric, target_value").eq("agent_id", agent.id).is("deleted_at", null).is("effective_to", null);
  if (e2) throw e2;
  for (const [metric, value] of Object.entries(metrics)) {
    const cur = current.find((t) => t.metric === metric);
    if (cur && Number(cur.target_value) === value) { console.log(`${agent.full_name}: ${metric} already ${value}`); continue; }
    if (cur) { console.log(`${agent.full_name}: ${metric} is ${cur.target_value}, leaving it (change it on the Team page)`); continue; }
    console.log(`${APPLY ? "set" : "would set"} ${agent.full_name}: ${metric} = ${value} a ${PERIOD[metric]}`);
    if (APPLY) {
      const { error: e3 } = await db.from("agent_targets").insert({ agent_id: agent.id, metric, period: PERIOD[metric], target_value: value, effective_from: FROM });
      if (e3) throw e3;
    }
  }
}
if (!APPLY) console.log("\nDry run. Add --apply to write.");
