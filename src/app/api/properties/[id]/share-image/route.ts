// The listing's cover as a JPEG from our own origin, so the app's Share button can attach it
// to WhatsApp (browsers won't hand a cross-origin image to the share sheet). Signed-in users
// only; RLS decides whether this user may see the property.
import { createClient } from "@/lib/supabase/server";

type Variants = Record<string, { url?: string } | undefined>;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Bad property id", { status: 400 });
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return new Response("Sign in first", { status: 401 });

  const { data: photos } = await supabase
    .from("property_photos")
    .select("variants, is_cover, is_public, sort_order")
    .eq("property_id", id)
    .is("deleted_at", null)
    .eq("is_public", true)
    .order("is_cover", { ascending: false })
    .order("sort_order")
    .limit(1);
  const v = (photos?.[0]?.variants ?? null) as Variants | null;
  const url = v?.share?.url ?? v?.["1600"]?.url;
  const base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  // only ever fetch from our own photo bucket
  if (!url || !base || !url.startsWith(base + "/")) return new Response("No cover photo", { status: 404 });

  const r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!r.ok || !r.body) return new Response("Cover unavailable", { status: 502 });
  return new Response(r.body, {
    headers: {
      "Content-Type": r.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
