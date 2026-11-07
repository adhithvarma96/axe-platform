// Website images chosen in the app: a development's building photo, a location's landmark,
// or a website page's image (home hero, lifestyle). Same pipeline as listing photos.
// Permission comes from the database: whoever may edit that record may set its image.
import { createClient } from "@/lib/supabase/server";
import { processPhoto } from "@/lib/photos/pipeline";
import { deletePhotoFiles, photoStoreFromEnv, uploadPhoto } from "@/lib/photos/storage";

const TABLES = { location: "locations", development: "developments", page: "site_pages" } as const;
type Kind = keyof typeof TABLES;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return Response.json({ error: "Sign in first" }, { status: 401 });

  const form = await request.formData();
  const kind = String(form.get("kind")) as Kind;
  const id = String(form.get("id") ?? "");
  const remove = form.get("remove") === "1";
  if (!(kind in TABLES)) return Response.json({ error: "Bad kind" }, { status: 400 });
  const table = TABLES[kind];
  const key = kind === "page" ? "path" : "id";
  if (kind !== "page" && !/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: "Bad id" }, { status: 400 });

  const { data: current } = await supabase.from(table as "locations").select("website_image").eq(key as "id", id).maybeSingle();
  if (!current) return Response.json({ error: "Not found" }, { status: 404 });
  const oldKeys = Object.values((current.website_image ?? {}) as Record<string, { key?: string }>).map((v) => v.key).filter(Boolean) as string[];

  let variants = null;
  if (!remove) {
    const file = form.get("photo");
    if (!(file instanceof File)) return Response.json({ error: "No photo" }, { status: 400 });
    if (file.size > 12 * 1024 * 1024) return Response.json({ error: "Photo too large" }, { status: 413 });
    let photo;
    try { photo = await processPhoto(Buffer.from(await file.arrayBuffer())); }
    catch { return Response.json({ error: "That file isn't a photo we can read" }, { status: 415 }); }
    const folder = kind === "page" ? `page${id.replace(/[^a-z0-9]+/gi, "-")}`.replace(/-+$/, "") || "page-home" : id;
    variants = await uploadPhoto(photoStoreFromEnv(), `website/${kind}/${folder}`, photo);
  }

  const { data: updated, error } = await supabase.from(table as "locations").update({ website_image: variants }).eq(key as "id", id).select("website_image").maybeSingle();
  if (error || !updated) return Response.json({ error: error?.message ?? "You don't have permission to change this image." }, { status: 403 });
  await deletePhotoFiles(photoStoreFromEnv(), oldKeys).catch(() => {}); // replaced files are no longer needed
  return Response.json({ ok: true });
}
