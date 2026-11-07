// Listing photo pipeline, shared by phone uploads (via the app) and imports.
//
// - Auto-rotates using the camera's orientation tag, then drops ALL metadata
//   (EXIF incl. GPS, camera serials, XMP). Owners' addresses must never leak
//   through a photo (moat rule + privacy).
// - Keeps no camera original: stores web sizes only, in WebP, plus one JPEG
//   for link previews (WhatsApp/Facebook read JPEG reliably).
// - Fingerprints the source bytes so the same photo is never stored twice on a
//   listing (fixes the old duplicate-photo problem).
//
// Plain TypeScript with no path aliases so scripts can import it too.
import { createHash } from "node:crypto";
import sharp from "sharp";

export const WEB_WIDTHS = [400, 800, 1600, 2048] as const;
export const SHARE_WIDTH = 1200;
const WEBP_QUALITY = 78;
const JPEG_QUALITY = 80;
/** Refuse anything absurd before decoding (a 60 MP photo is ~240 MB raw). */
const MAX_INPUT_PIXELS = 80_000_000;

export interface Variant {
  name: string; // "400", "800", "1600", "2048", "share"
  width: number;
  height: number;
  bytes: number;
  contentType: "image/webp" | "image/jpeg";
  ext: "webp" | "jpg";
  data: Buffer;
}

export interface ProcessedPhoto {
  hash: string; // sha256 of the uploaded bytes
  width: number; // largest stored width
  height: number;
  totalBytes: number;
  variants: Variant[];
}

export function fingerprint(input: Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function processPhoto(input: Buffer): Promise<ProcessedPhoto> {
  const base = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" }).rotate();
  const meta = await base.metadata();
  if (!meta.width || !meta.height) throw new Error("Not an image, or the image is damaged");
  // After .rotate(), portrait photos report swapped dimensions in metadata; compute the upright size.
  const swap = (meta.orientation ?? 1) >= 5;
  const srcW = swap ? meta.height : meta.width;

  const variants: Variant[] = [];
  const widths = WEB_WIDTHS.filter((w, i) => w <= srcW || i === 0); // never upscale; always keep the smallest
  for (const w of widths) {
    const { data, info } = await base
      .clone()
      .resize({ width: Math.min(w, srcW), withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    variants.push({ name: String(w), width: info.width, height: info.height, bytes: info.size, contentType: "image/webp", ext: "webp", data });
  }
  // A larger-than-2048 source still yields a 2048 copy; a smaller one keeps its own size as the largest.
  if (srcW > WEB_WIDTHS[0] && !widths.includes(Math.min(srcW, 2048) as never) && srcW < 2048) {
    const { data, info } = await base.clone().webp({ quality: WEBP_QUALITY }).toBuffer({ resolveWithObject: true });
    variants.push({ name: "full", width: info.width, height: info.height, bytes: info.size, contentType: "image/webp", ext: "webp", data });
  }
  const share = await base
    .clone()
    .resize({ width: Math.min(SHARE_WIDTH, srcW), withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  variants.push({ name: "share", width: share.info.width, height: share.info.height, bytes: share.info.size, contentType: "image/jpeg", ext: "jpg", data: share.data });

  const largest = variants.filter((v) => v.ext === "webp").sort((a, b) => b.width - a.width)[0];
  return {
    hash: fingerprint(input),
    width: largest.width,
    height: largest.height,
    totalBytes: variants.reduce((a, v) => a + v.bytes, 0),
    variants,
  };
}

/** Storage key for one variant: properties/<property id>/<hash prefix>/<name>.<ext> */
export function variantKey(propertyId: string, hash: string, v: Pick<Variant, "name" | "ext">): string {
  return `properties/${propertyId}/${hash.slice(0, 20)}/${v.name}.${v.ext}`;
}
