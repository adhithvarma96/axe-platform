"use client";
import { useCallback, useEffect, useState } from "react";

export interface GalleryPhoto { thumb: string; large: string; width: number; height: number }

/** Photo grid with a full-screen viewer (swipe, arrows, Esc). Used on listing pages and client galleries. */
export function Gallery({ photos, title, layout = "listing" }: { photos: GalleryPhoto[]; title: string; layout?: "listing" | "grid" }) {
  const [open, setOpen] = useState<number | null>(null);
  const [touchX, setTouchX] = useState<number | null>(null);
  const go = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + photos.length) % photos.length)), [photos.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, go]);

  if (!photos.length) {
    return <div style={{ aspectRatio: "16 / 7", background: "#d9d6ce", borderRadius: 12, display: "grid", placeItems: "center", color: "#3c434a" }}>Photos coming soon</div>;
  }

  const btn = (i: number, style: React.CSSProperties, children?: React.ReactNode) => (
    <button
      key={i}
      type="button"
      onClick={() => setOpen(i)}
      aria-label={`Open photo ${i + 1} of ${photos.length}`}
      style={{ position: "relative", padding: 0, border: 0, borderRadius: 12, overflow: "hidden", cursor: "zoom-in", background: "#d9d6ce", ...style }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photos[i].thumb} alt={`${title}, photo ${i + 1}`} loading={i < 3 ? "eager" : "lazy"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      {children}
    </button>
  );

  return (
    <>
      {layout === "listing" ? (
        <div className="gallery-grid">
          {btn(0, { gridColumn: "1 / 3", gridRow: "1 / 3" })}
          {photos.slice(1, 5).map((_, k) => {
            const i = k + 1;
            const more = i === 4 && photos.length > 5;
            return btn(i, {}, more ? <span className="gallery-more">+ {photos.length - 5} photos</span> : undefined);
          })}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {photos.map((_, i) => btn(i, { aspectRatio: "4 / 3" }))}
        </div>
      )}

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title}, photo ${open + 1} of ${photos.length}`}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.94)", zIndex: 100, display: "flex", flexDirection: "column" }}
          onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
          onTouchEnd={(e) => { if (touchX !== null) { const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); } setTouchX(null); }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff", padding: "12px max(16px, env(safe-area-inset-left, 0px))", fontSize: 14 }}>
            <span>{open + 1} / {photos.length}</span>
            <button type="button" onClick={() => setOpen(null)} aria-label="Close photos" style={{ background: "transparent", color: "#fff", border: 0, fontSize: 30, cursor: "pointer", minWidth: 44, minHeight: 44 }}>×</button>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0, position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[open].large} alt={`${title}, photo ${open + 1}`} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="lb-arrow" style={{ left: 8 }}>‹</button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className="lb-arrow" style={{ right: 8 }}>›</button>
          </div>
        </div>
      )}
    </>
  );
}
