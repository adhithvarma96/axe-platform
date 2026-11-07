"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { setGalleryEnabled } from "../actions";

interface Props {
  propertyId: string;
  listingNo: string;
  text: string;
  hasCover: boolean;
  galleryUrl: string | null;
  galleryEnabled: boolean;
}

/** SPEC 7.12: one tap to WhatsApp with the cover photo attached and the write-up as caption.
 *  Phones get the system share sheet; desktops get the write-up copied and the cover downloaded. */
export function SharePanel({ propertyId, listingNo, text, hasCover, galleryUrl, galleryEnabled }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const cover = useRef<File | null>(null);
  const canShareFiles = useRef(false);

  // Fetch the cover ahead of the tap: the share sheet must open straight from the click.
  useEffect(() => {
    if (!hasCover) return;
    let cancelled = false;
    fetch(`/api/properties/${propertyId}/share-image/`)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (cancelled || !b) return;
        const f = new File([b], `${listingNo}.jpg`, { type: b.type || "image/jpeg" });
        cover.current = f;
        canShareFiles.current = typeof navigator.canShare === "function" && navigator.canShare({ files: [f] });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [propertyId, listingNo, hasCover]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
  };

  const share = async () => {
    setStatus(null);
    const copied = copy(); // in case WhatsApp drops the caption
    const isPhone = typeof navigator.share === "function" && matchMedia("(pointer: coarse)").matches;
    if (isPhone) {
      try {
        if (cover.current && canShareFiles.current) await navigator.share({ files: [cover.current], text });
        else await navigator.share({ text });
        setStatus("Shared. The write-up is also on your clipboard.");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setStatus((await copied) ? "Couldn't open the share sheet; the write-up is copied, paste it in WhatsApp." : "Couldn't share. Use Copy write-up instead.");
      }
      return;
    }
    // desktop: copy + download the cover
    const ok = await copied;
    if (cover.current) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(cover.current);
      a.download = cover.current.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }
    setStatus(`${ok ? "Write-up copied" : "Couldn't copy (select the text below)"}${cover.current ? " and cover photo downloaded" : ""}. Paste into WhatsApp Web and attach the photo.`);
  };

  return (
    <section className="panel" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Share</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-sm" onClick={share} style={{ background: "#25D366", borderColor: "#25D366", color: "#fff" }}>
            Share on WhatsApp
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={async () => setStatus((await copy()) ? "Write-up copied." : "Couldn't copy; select the text below.")}>
            Copy write-up
          </button>
        </div>
      </div>
      {status && <p role="status" className="muted" style={{ margin: 0, fontSize: 13 }}>{status}</p>}
      <details>
        <summary className="muted" style={{ cursor: "pointer", fontSize: 13 }}>Preview write-up</summary>
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, margin: "8px 0 0", userSelect: "all" }}>{text}</pre>
      </details>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", fontSize: 13 }}>
        <span className="muted">Client photo link:</span>
        {galleryEnabled && galleryUrl ? <a href={galleryUrl} target="_blank" rel="noreferrer">Open gallery ↗</a> : <span className="muted">{galleryEnabled ? "add a visible photo first" : "switched off"}</span>}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={pending}
          onClick={() => start(async () => { const r = await setGalleryEnabled(propertyId, !galleryEnabled); setStatus(r.error ?? (galleryEnabled ? "Photo link switched off. Old links now show 'expired'." : "Photo link switched on.")); })}
        >
          {pending ? "Saving…" : galleryEnabled ? "Switch link off" : "Switch link on"}
        </button>
      </div>
    </section>
  );
}
