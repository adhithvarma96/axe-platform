// Photo upload from the app (phone or desktop). The browser has already shrunk the
// photo; here it is processed (rotate, strip GPS/EXIF, WebP sizes), stored in R2 and
// recorded. The database decides whether this user may add photos (RLS).
import { createClient } from "@/lib/supabase/server";
import { processPhoto } from "@/lib/photos/pipeline";
import { photoStoreFromEnv, uploadPhoto } from "@/lib/photos/storage";

const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: "Bad property id" }, { status: 400 });
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return Response.json({ error: "Sign in first" }, { status: 401 });

  // Can this user see the property? (RLS)
  const { data: property } = await supabase.from("properties").select("id").eq("id", id).maybeSingle();
  if (!property) return Response.json({ error: "Property not found" }, { status: 404 });

  const form = await request.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) return Response.json({ error: "No photo" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Photo too large" }, { status: 413 });

  let photo;
  try {
    photo = await processPhoto(Buffer.from(await file.arrayBuffer()));
  } catch {
    return Response.json({ error: `${file.name} isn't a photo we can read` }, { status: 415 });
  }

  const { data: existing } = await supabase
    .from("property_photos").select("content_hash, sort_order, is_cover").eq("property_id", id).is("deleted_at", null);
  if ((existing ?? []).some((e) => e.content_hash === photo.hash)) {
    return Response.json({ skipped: true, reason: "This photo is already on the listing" });
  }

  const variants = await uploadPhoto(photoStoreFromEnv(), id, photo);
  const { error } = await supabase.from("property_photos").insert({
    property_id: id,
    storage_path: `properties/${id}/${photo.hash.slice(0, 20)}`,
    original_filename: file.name.slice(0, 200),
    source: "upload",
    source_ref: photo.hash,
    content_hash: photo.hash,
    sort_order: Math.max(-1, ...(existing ?? []).map((e) => e.sort_order)) + 1,
    is_cover: !(existing ?? []).some((e) => e.is_cover),
    width: photo.width,
    height: photo.height,
    bytes: photo.totalBytes,
    variants,
    is_public: true,
  });
  if (error) return Response.json({ error: error.message }, { status: 403 });
  return Response.json({ ok: true, bytes: photo.totalBytes });
}
