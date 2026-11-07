#!/usr/bin/env node
// Imports listing photos from each property's public Google Drive folder ("Photos Link").
// Each photo: download -> auto-rotate, strip GPS/EXIF, WebP sizes + JPEG share copy -> R2 -> property_photos row.
// Resumable: a Drive file already imported for a property (source_ref) or a byte-identical photo (content_hash) is skipped.
//
//   node --env-file=.env.local scripts/import-drive-photos.ts                 # dry run: list folders and counts
//   node --env-file=.env.local scripts/import-drive-photos.ts --apply         # import (staging)
//   ... --apply --only AX260369,AX260370                                       # just these listings
//   ... --apply --status available,reserved                                    # only these statuses
//
// Auth, in order of preference:
//   GOOGLE_SERVICE_ACCOUNT_FILE=.secrets/google-service-account.json  (signed-in: normal Drive quotas)
//   GOOGLE_API_KEY  (anonymous: works, but Google throttles bulk downloads hard)
import { createClient } from "@supabase/supabase-js";
import { GoogleAuth } from "google-auth-library";
import { processPhoto } from "../src/lib/photos/pipeline.ts";
import { photoStoreFromEnv, uploadPhoto } from "../src/lib/photos/storage.ts";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const ONLY = opt("--only")?.split(",").map((s) => s.trim().toUpperCase());
const STATUSES = opt("--status")?.split(",").map((s) => s.trim().toLowerCase());
const PROD_REF = "divuqbipkxdofkyrbfxh";

const env = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`Missing ${k}`); return v; };
if (APPLY && env("NEXT_PUBLIC_SUPABASE_URL").includes(PROD_REF) && !args.includes("--production")) throw new Error("Target is PRODUCTION. Pass --production to confirm.");
const SA_FILE = process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
const KEY = SA_FILE ? undefined : env("GOOGLE_API_KEY");
const gauth = SA_FILE ? new GoogleAuth({ keyFile: SA_FILE, scopes: ["https://www.googleapis.com/auth/drive.readonly"] }) : null;
async function authHeader(): Promise<Record<string, string>> {
  if (!gauth) return {};
  const token = await (await gauth.getClient()).getAccessToken();
  return { Authorization: `Bearer ${token.token}` };
}
console.log(`Google Drive auth: ${SA_FILE ? "service account" : "API key (anonymous)"}`);
const db = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), { auth: { persistSession: false } });
const store = APPLY ? photoStoreFromEnv() : null;

const IMAGE = /^image\/(jpeg|png|webp|heic|heif|tiff|gif)$/;
const folderId = (url: string) => url.match(/\/folders\/([A-Za-z0-9_-]{10,})/)?.[1] ?? url.match(/[?&]id=([A-Za-z0-9_-]{10,})/)?.[1] ?? null;

interface DriveFile { id: string; name: string; mimeType: string; size?: string; createdTime?: string }
async function drive(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams({ ...params, ...(KEY ? { key: KEY } : {}), supportsAllDrives: "true", includeItemsFromAllDrives: "true" });
  // Google throttles bursts of downloads with a 403 "Sorry..." page or rate-limit errors:
  // back off 30s, 60s, 120s, 240s and retry; any other 4xx is a real error.
  const waits = [0, 30_000, 60_000, 120_000, 240_000];
  for (let attempt = 0; attempt < waits.length; attempt++) {
    if (waits[attempt]) { console.log(`    (Google is throttling; waiting ${waits[attempt] / 1000}s)`); await new Promise((res) => setTimeout(res, waits[attempt])); }
    const r = await fetch(`https://www.googleapis.com/drive/v3/${path}?${qs}`, { headers: await authHeader() });
    if (r.ok) return r;
    const body = await r.text();
    const throttled = r.status === 429 || r.status >= 500 || (r.status === 403 && /Sorry|rateLimit|userRateLimit|automated/i.test(body));
    if (!throttled) throw new Error(`Drive ${path}: HTTP ${r.status} ${body.slice(0, 160)}`);
  }
  throw new Error(`Drive ${path}: gave up after retries`);
}
async function listImages(folder: string, depth = 0): Promise<DriveFile[]> {
  const out: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const r = await drive("files", {
      q: `'${folder}' in parents and trashed = false`, pageSize: "200", orderBy: "name",
      fields: "nextPageToken, files(id, name, mimeType, size, createdTime)", ...(pageToken ? { pageToken } : {}),
    });
    const j = (await r.json()) as { files: DriveFile[]; nextPageToken?: string };
    for (const f of j.files) {
      if (IMAGE.test(f.mimeType)) out.push(f);
      else if (f.mimeType === "application/vnd.google-apps.folder" && depth < 2) out.push(...(await listImages(f.id, depth + 1)));
    }
    pageToken = j.nextPageToken;
  } while (pageToken);
  return out;
}

// Properties with a Drive link
let q = db.from("properties").select("id, listing_no, status, photos_link").not("photos_link", "is", null).is("deleted_at", null).order("seq_no");
if (ONLY) q = q.in("listing_no", ONLY);
if (STATUSES) q = q.in("status", STATUSES);
const { data: props, error } = await q;
if (error) throw error;
console.log(`${APPLY ? "Importing" : "Dry run:"} ${props!.length} listings with a Drive link`);

const totals = { listings: 0, folders_unreadable: 0, photos_found: 0, imported: 0, skipped: 0, failed: 0, bytes_in: 0, bytes_out: 0 };
for (const p of props!) {
  const fid = folderId(p.photos_link);
  if (!fid) { console.log(`  ${p.listing_no}: not a Drive folder link, skipped`); totals.folders_unreadable++; continue; }
  let files: DriveFile[];
  try { files = await listImages(fid); } catch (e) { console.log(`  ${p.listing_no}: ${(e as Error).message}`); totals.folders_unreadable++; continue; }
  totals.listings++;
  totals.photos_found += files.length;
  if (!APPLY) { console.log(`  ${p.listing_no} (${p.status}): ${files.length} photos`); continue; }

  const { data: existing } = await db.from("property_photos").select("source_ref, content_hash, is_cover, sort_order").eq("property_id", p.id).is("deleted_at", null);
  const seenRefs = new Set((existing ?? []).map((e) => e.source_ref));
  const seenHashes = new Set((existing ?? []).map((e) => e.content_hash));
  let hasCover = (existing ?? []).some((e) => e.is_cover);
  let order = Math.max(0, ...(existing ?? []).map((e) => e.sort_order + 1));
  let done = 0;
  for (const f of files) {
    if (seenRefs.has(f.id)) { totals.skipped++; continue; }
    await new Promise((res) => setTimeout(res, 1200)); // pace downloads to stay under Google's burst limit
    try {
      const bytes = Buffer.from(await (await drive(`files/${f.id}`, { alt: "media" })).arrayBuffer());
      const photo = await processPhoto(bytes);
      if (seenHashes.has(photo.hash)) { totals.skipped++; continue; }
      const variants = await uploadPhoto(store!, p.id, photo);
      const { error: e } = await db.from("property_photos").insert({
        property_id: p.id, storage_path: `properties/${p.id}/${photo.hash.slice(0, 20)}`, original_filename: f.name,
        source: "drive_import", source_ref: f.id, content_hash: photo.hash, sort_order: order++, is_cover: !hasCover,
        width: photo.width, height: photo.height, bytes: photo.totalBytes, variants, is_public: true,
      });
      if (e) throw new Error(e.message);
      hasCover = true; seenHashes.add(photo.hash); done++;
      totals.imported++; totals.bytes_in += bytes.length; totals.bytes_out += photo.totalBytes;
    } catch (e) { totals.failed++; console.log(`  ${p.listing_no}: ${f.name}: ${(e as Error).message}`); }
  }
  console.log(`  ${p.listing_no}: ${done} imported, ${files.length - done} skipped/failed`);
}
const mb = (n: number) => (n / 1048576).toFixed(1) + " MB";
console.log("\n" + JSON.stringify({ ...totals, bytes_in: mb(totals.bytes_in), bytes_out: mb(totals.bytes_out) }, null, 2));
