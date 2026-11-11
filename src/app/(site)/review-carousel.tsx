"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Reviews slide along on their own: one card every 6 seconds, looping back to the start.
 * Pauses while the visitor hovers, touches or tabs into it, and stays still for people who
 * ask their device for reduced motion. Arrows let anyone move it by hand.
 */
export function ReviewCarousel({ children, every = 6000 }: { children: React.ReactNode; every?: number }) {
  const row = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  const step = (dir: 1 | -1) => {
    const el = row.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".review");
    const w = (card?.offsetWidth ?? 320) + 18;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
    if (dir === 1 && atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
    else if (dir === -1 && el.scrollLeft <= 8) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    else el.scrollBy({ left: dir * w, behavior: "smooth" });
  };

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => { if (document.visibilityState === "visible") step(1); }, every);
    return () => clearInterval(t);
  }, [paused, every]);

  return (
    <div className="carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)} onTouchStart={() => setPaused(true)}>
      <div className="reviews-row" role="list" ref={row}>{children}</div>
      <div className="carousel-nav">
        <button type="button" aria-label="Previous review" onClick={() => step(-1)}>‹</button>
        <button type="button" aria-label="Next review" onClick={() => step(1)}>›</button>
      </div>
    </div>
  );
}
