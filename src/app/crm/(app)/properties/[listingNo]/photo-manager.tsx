"use client";
import { IDEAL } from "@/lib/photos/preview";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePhoto, movePhoto, setCover, setPhotoPublic } from "../actions";

interface Photo { id: string; url: string; isCover: boolean; isPublic: boolean }

const MAX_EDGE = 2560;
const JPEG_QUALITY = 0.85;

/** Shrinks a photo on the device before upload. Drawing to a canvas also drops EXIF/GPS. */
async function compress(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", JPEG_QUALITY));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file; // the server still processes it (e.g. formats the browser can't decode)
  }
}

export function PhotoManager({ propertyId, listingNo, photos, isAdmin }: { propertyId: string; listingNo: string; photos: Photo[]; isAdmin: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files);
    let done = 0, skipped = 0, saved = 0;
    const failed: string[] = [];
    for (const f of list) {
      setProgress(`Shrinking and uploading ${done + 1} of ${list.length}…`);
      const small = await compress(f);
      saved += Math.max(0, f.size - small.size);
      const body = new FormData();
      body.append("photo", small, f.name.replace(/\.(heic|heif|png|webp)$/i, ".jpg"));
      try {
        const r = await fetch(`/api/properties/${propertyId}/photos/`, { method: "POST", body });
        const j = await r.json();
        if (!r.ok) failed.push(`${f.name}: ${j.error ?? r.status}`);
        else if (j.skipped) skipped++;
      } catch {
        failed.push(`${f.name}: network error`);
      }
      done++;
    }
    setProgress(`Done: ${done - failed.length - skipped} added${skipped ? `, ${skipped} already on this listing` : ""}. Saved ${(saved / 1048576).toFixed(1)} MB of upload.`);
    if (failed.length) setError(failed.join(" · "));
    if (input.current) input.current.value = "";
    router.refresh();
  }

  const run = (fn: () => Promise<{ error?: string }>) =>
    startTransition(async () => { const r = await fn(); if (r.error) setError(r.error); });

  return (
    <section className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Photos ({photos.length})</h2>
        <label className="btn btn-sm" style={{ cursor: "pointer" }}>
          + Add photos
          <input ref={input} type="file" accept="image/*" multiple onChange={(e) => upload(e.target.files)} className="sr-only" />
        </label>
      </div>
      <p className="muted" style={{ fontSize: 12, margin: "0 0 10px" }}><b style={{ color: "var(--ink)" }}>Ideal size:</b> {IDEAL.listing.text}. The first photo is the cover on the website and in WhatsApp shares.</p>
      {progress && <p className="muted" role="status" style={{ fontSize: 13, marginBottom: 10 }}>{progress}</p>}
      {error && <p className="error" role="alert" style={{ marginBottom: 10 }}>{error}</p>}
      {photos.length ? (
        <ol className="gallery" style={{ listStyle: "none", padding: 0, margin: 0, opacity: busy ? 0.6 : 1 }}>
          {photos.map((ph, i) => (
            <li key={ph.id} className="photo-tile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ph.url} alt={`Photo ${i + 1} of ${listingNo}`} loading="lazy" style={{ opacity: ph.isPublic ? 1 : 0.4 }} />
              <div className="photo-flags">
                {ph.isCover && <span className="badge badge-live">Cover</span>}
                {!ph.isPublic && <span className="badge">Hidden</span>}
              </div>
              <div className="photo-actions">
                <button type="button" aria-label="Move earlier" disabled={i === 0 || busy} onClick={() => run(() => movePhoto(propertyId, ph.id, -1))}>←</button>
                <button type="button" aria-label="Move later" disabled={i === photos.length - 1 || busy} onClick={() => run(() => movePhoto(propertyId, ph.id, 1))}>→</button>
                {!ph.isCover && <button type="button" disabled={busy} onClick={() => run(() => setCover(propertyId, ph.id))}>Cover</button>}
                <button type="button" disabled={busy} onClick={() => run(() => setPhotoPublic(ph.id, !ph.isPublic))}>{ph.isPublic ? "Hide" : "Show"}</button>
                {isAdmin && <button type="button" disabled={busy} onClick={() => run(() => deletePhoto(ph.id))} aria-label="Delete photo">✕</button>}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">No photos yet. Add them from your phone&apos;s camera roll; they&apos;re shrunk before uploading.</p>
      )}
    </section>
  );
}
