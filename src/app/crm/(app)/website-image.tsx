"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compressForUpload } from "@/lib/photos/compress";

/** Pick, replace or remove the website image of a development, location or website page. */
export function WebsiteImage({ kind, id, url, hint }: { kind: "location" | "development" | "page"; id: string; url: string | null; hint: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(file: File | null) {
    setError(null);
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
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ width: 160, aspectRatio: "4 / 3", borderRadius: 8, overflow: "hidden", background: "var(--card)", flexShrink: 0, display: "grid", placeItems: "center" }}>
        {url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={url} alt="Current website image" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span className="muted" style={{ fontSize: 12, textAlign: "center", padding: 8 }}>Using a listing photo</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: "1 1 200px" }}>
        <span className="muted" style={{ fontSize: 13 }}>{hint}</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label className="btn btn-sm" style={{ cursor: "pointer" }}>
            {url ? "Replace image" : "Choose image"}
            <input ref={input} type="file" accept="image/*" className="sr-only" onChange={(e) => send(e.target.files?.[0] ?? null)} disabled={!!busy} />
          </label>
          {url && <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => send(null)}>Remove</button>}
        </div>
        {busy && <span className="muted" role="status" style={{ fontSize: 13 }}>{busy}</span>}
        {error && <span className="error" role="alert" style={{ fontSize: 13 }}>{error}</span>}
      </div>
    </div>
  );
}
