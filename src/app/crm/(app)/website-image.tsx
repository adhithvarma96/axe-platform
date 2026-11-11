"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compressForUpload } from "@/lib/photos/compress";
import { IDEAL, previewUrl, type IdealKey } from "@/lib/photos/preview";

/** Pick, replace or remove an image: a development, location or website page image, or an agent's headshot. */
export function WebsiteImage({ kind, id, image, url: urlProp, hint, ideal = "tile", square = false }: {
  kind: "location" | "development" | "page" | "agent"; id: string; image?: unknown; url?: string | null; hint: string; ideal?: IdealKey; square?: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const url = urlProp ?? previewUrl(image);
  const spec = IDEAL[ideal];

  async function send(file: File | null) {
    setError(null);
    setWarn(null);
    const body = new FormData();
    body.append("kind", kind);
    body.append("id", id);
    if (file) {
      setBusy("Shrinking and uploading…");
      body.append("photo", await compressForUpload(file), file.name.replace(/\.\w+$/, ".jpg"));
    } else {
      setBusy("Removing…");
      body.append("remove", "1");
    }
    const r = await fetch("/api/website-images/", { method: "POST", body });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) setError(j.error ?? "Upload failed");
    else if (file && j.width && j.width < spec.min) setWarn(`Saved, but it is only ${j.width} px wide, so it may look soft on large screens. Ideal: ${spec.text}.`);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ width: square ? 120 : 160, aspectRatio: square ? "1 / 1" : "4 / 3", borderRadius: square ? "50%" : 8, overflow: "hidden", background: "var(--card)", flexShrink: 0, display: "grid", placeItems: "center" }}>
        {url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={url} alt="Current image" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span className="muted" style={{ fontSize: 12, textAlign: "center", padding: 8 }}>{kind === "agent" ? "No photo yet" : "Using a listing photo"}</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: "1 1 200px" }}>
        <span className="muted" style={{ fontSize: 13 }}>{hint}</span>
        <span style={{ fontSize: 12, color: "var(--ink)" }}><b>Ideal size:</b> {spec.text}. JPG or PNG, up to 12 MB.</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label className="btn btn-sm" style={{ cursor: "pointer" }}>
            {url ? "Replace image" : "Choose image"}
            <input ref={input} type="file" accept="image/*" className="sr-only" onChange={(e) => send(e.target.files?.[0] ?? null)} disabled={!!busy} />
          </label>
          {url && <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => send(null)}>Remove</button>}
        </div>
        {busy && <span className="muted" role="status" style={{ fontSize: 13 }}>{busy}</span>}
        {warn && <span className="protocol" role="status" style={{ fontSize: 13, margin: 0 }}>{warn}</span>}
        {error && <span className="error" role="alert" style={{ fontSize: 13 }}>{error}</span>}
      </div>
    </div>
  );
}
