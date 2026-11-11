"use server";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PartyState } from "../party-form";

const s = (f: FormData, k: string) => { const v = String(f.get(k) ?? "").trim(); return v || null; };
const int = (f: FormData, k: string) => { const v = s(f, k); if (v == null) return null; const n = Number(v.replace(/,/g, "")); return Number.isInteger(n) && n >= 0 ? n : NaN; };
const STATUS = ["completed", "under_construction", "off_plan", "pre_launch"];
const friendly = (m: string) => (/developments_name_key|duplicate/i.test(m) ? "A development with that name already exists." : /row-level/i.test(m) ? "You don't have permission to do that." : m);

/** Add or edit a development. Its website page (address and copy) is set up separately with Adhith. */
export async function saveDevelopment(_prev: PartyState, form: FormData): Promise<PartyState> {
  await requireUser();
  const id = s(form, "id");
  const name = s(form, "name");
  if (!name) return { error: "Enter the development's name." };
  const year = int(form, "year_completed"), units = int(form, "total_units");
  if (Number.isNaN(year) || (year != null && (year < 1950 || year > 2100))) return { error: "Year completed: enter a year like 2024." };
  if (Number.isNaN(units)) return { error: "Total units: enter a whole number." };
  const status = s(form, "development_status");
  const row = {
    name, location_id: s(form, "location_id"), developer_builder: s(form, "developer_builder"),
    year_completed: year, total_units: units, towers_blocks: s(form, "towers_blocks"),
    development_status: (status && STATUS.includes(status) ? status : null) as never, notes: s(form, "notes"),
  };
  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("developments").update(row).eq("id", id);
    if (error) return { error: friendly(error.message) };
    redirect(`/developments/${id}`);
  }
  const { data, error } = await supabase.from("developments").insert(row).select("id").single();
  if (error) return { error: friendly(error.message) };
  redirect(`/developments/${data.id}`);
}

export async function addTower(developmentId: string, name: string): Promise<{ error?: string }> {
  await requireUser();
  const n = name.trim();
  if (!n) return { error: "Enter the tower's name." };
  const supabase = await createClient();
  const { error } = await supabase.from("development_towers").insert({ development_id: developmentId, name: n });
  if (error) return { error: /duplicate|unique/i.test(error.message) ? "That tower already exists here." : friendly(error.message) };
  refresh();
  return {};
}

export async function renameTower(id: string, name: string): Promise<{ error?: string }> {
  await requireUser();
  const n = name.trim();
  if (!n) return { error: "Enter the tower's name." };
  const supabase = await createClient();
  const { error } = await supabase.from("development_towers").update({ name: n }).eq("id", id);
  if (error) return { error: /duplicate|unique/i.test(error.message) ? "That tower already exists here." : friendly(error.message) };
  refresh();
  return {};
}
