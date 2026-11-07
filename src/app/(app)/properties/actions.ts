"use server";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseProperty } from "@/lib/property-fields";

export type FormState = { error?: string };

/** Create or update a property. Permissions are enforced by the database (RLS + triggers). */
export async function saveProperty(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const supabase = await createClient();
  const id = String(form.get("id") ?? "") || null;
  let row: Record<string, unknown>;
  try {
    row = parseProperty(form, user.role === "super_admin");
  } catch (e) {
    return { error: (e as Error).message };
  }

  // A tower must belong to the chosen development.
  if (row.tower_id) {
    const { data: t } = await supabase.from("development_towers").select("development_id").eq("id", row.tower_id as string).maybeSingle();
    if (!t || t.development_id !== row.development_id) return { error: "That tower doesn't belong to the chosen development." };
  }

  let listingNo: string | null = null;
  let propertyId = id;
  if (id) {
    const { data, error } = await supabase.from("properties").update(row as never).eq("id", id).select("id, listing_no").maybeSingle();
    if (error) return { error: friendly(error.message) };
    if (!data) return { error: "You don't have permission to edit this property." };
    listingNo = data.listing_no;
  } else {
    const { data, error } = await supabase.from("properties").insert(row as never).select("id, listing_no").single();
    if (error) return { error: friendly(error.message) };
    listingNo = data.listing_no;
    propertyId = data.id;
  }

  // Features (Penthouse, Duplex, Pet Friendly, Sea View ...)
  const features = form.getAll("feature").map(String).filter((f) => /^[0-9a-f-]{36}$/.test(f));
  await supabase.from("property_feature_links").delete().eq("property_id", propertyId!);
  if (features.length) {
    const { error } = await supabase.from("property_feature_links").insert(features.map((feature_id) => ({ property_id: propertyId!, feature_id })));
    if (error) return { error: friendly(error.message) };
  }
  redirect(`/properties/${listingNo}`);
}

function friendly(msg: string): string {
  if (/properties_referrer_required/.test(msg)) return "A via-referrer sourcing model needs a referral partner.";
  if (/commission structure/i.test(msg)) return "Only a Super Admin can change the commission structure.";
  if (/row-level security/i.test(msg)) return "You don't have permission to do that.";
  return msg;
}

/** Publish switch. Turning on requires a website-ready listing. */
export async function setPublished(propertyId: string, publish: boolean): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();
  if (publish) {
    const { data: p } = await supabase
      .from("properties")
      .select("status, asking_rent, asking_sale_price, price_on_request, listing_types, property_photos(id, is_public, deleted_at)")
      .eq("id", propertyId)
      .maybeSingle();
    if (!p) return { error: "Property not found." };
    const missing: string[] = [];
    if (!["available", "reserved"].includes(p.status)) missing.push("status must be Available or Reserved");
    if (!p.listing_types?.length) missing.push("choose rent and/or sale");
    if (!p.asking_rent && !p.asking_sale_price && !p.price_on_request) missing.push("add a price, or tick Price on request");
    if (!(p.property_photos ?? []).some((ph) => ph.is_public && !ph.deleted_at)) missing.push("add at least one photo");
    if (missing.length) return { error: `Can't publish yet: ${missing.join("; ")}.` };
  }
  const { error } = await supabase
    .from("properties")
    .update({ website_published: publish, website_published_at: publish ? new Date().toISOString() : null })
    .eq("id", propertyId);
  if (error) return { error: friendly(error.message) };
  refresh();
  return {};
}

// ---------------------------------------------------------------------------
// Photo manager
// ---------------------------------------------------------------------------
export async function setCover(propertyId: string, photoId: string): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();
  const off = await supabase.from("property_photos").update({ is_cover: false }).eq("property_id", propertyId).eq("is_cover", true);
  if (off.error) return { error: friendly(off.error.message) };
  const on = await supabase.from("property_photos").update({ is_cover: true }).eq("id", photoId).eq("property_id", propertyId);
  if (on.error) return { error: friendly(on.error.message) };
  refresh();
  return {};
}

export async function movePhoto(propertyId: string, photoId: string, dir: -1 | 1): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();
  const { data: photos } = await supabase
    .from("property_photos").select("id, sort_order").eq("property_id", propertyId).is("deleted_at", null).order("sort_order");
  if (!photos) return { error: "Could not load photos." };
  const i = photos.findIndex((p) => p.id === photoId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= photos.length) return {};
  [photos[i], photos[j]] = [photos[j], photos[i]];
  for (let k = 0; k < photos.length; k++) {
    if (photos[k].sort_order !== k) {
      const { error } = await supabase.from("property_photos").update({ sort_order: k }).eq("id", photos[k].id);
      if (error) return { error: friendly(error.message) };
    }
  }
  refresh();
  return {};
}

export async function setPhotoPublic(photoId: string, isPublic: boolean): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("property_photos").update({ is_public: isPublic }).eq("id", photoId);
  if (error) return { error: friendly(error.message) };
  refresh();
  return {};
}

/** Soft delete (Super Admin). The files stay in storage until the photo is purged. */
export async function deletePhoto(photoId: string): Promise<FormState> {
  const user = await requireUser();
  if (user.role !== "super_admin") return { error: "Only a Super Admin can delete photos. You can hide it from the website instead." };
  const supabase = await createClient();
  const { error } = await supabase.from("property_photos").update({ deleted_at: new Date().toISOString(), is_cover: false }).eq("id", photoId);
  if (error) return { error: friendly(error.message) };
  refresh();
  return {};
}
