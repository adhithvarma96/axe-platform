"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";

/** Auto-submits the filter form whenever a control changes (works as a plain GET form without JavaScript). */
export function FilterForm({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const submit = () => {
    const form = ref.current!;
    const qs = new URLSearchParams();
    new FormData(form).forEach((v, k) => { if (String(v) && !(k === "intent" && v === "all") && !(k === "furn" && v === "any") && !(k === "sort" && v === "new") && !(k === "cur" && v === "USD") && !(k === "type" && v === "apartment") && !((k === "beds" || k === "baths") && v === "0")) qs.append(k, String(v)); });
    router.replace(`/properties/${qs.size ? `?${qs}` : ""}`, { scroll: false });
  };
  return (
    <form ref={ref} action="/properties/" method="get" onChange={submit} onSubmit={(e) => { e.preventDefault(); submit(); }} className="filters-form">
      {children}
    </form>
  );
}

/** Two-handle price slider. Squared scale: more room at the cheaper end. Top of the bar = no max. */
export function PriceSlider({ top, cur, perMonth, min, max }: { top: number; cur: "LKR" | "USD"; perMonth: boolean; min: number | null; max: number | null }) {
  const roundSig = (v: number) => { if (v <= 0) return 0; const m = 10 ** (Math.floor(Math.log10(v)) - 1); return Math.round(v / m) * m; };
  const valAt = (pos: number) => (pos <= 0 ? 0 : roundSig(top * (pos / 1000) ** 2));
  const posOf = (v: number) => Math.round(Math.sqrt(Math.min(v, top) / top) * 1000);
  const [lo, setLo] = useState(min ? posOf(min) : 0);
  const [hi, setHi] = useState(max ? posOf(max) : 1000);
  const minVal = lo > 0 ? valAt(lo) : null;
  const maxVal = hi < 1000 ? valAt(hi) : null;
  const fmt = (v: number) => money(v, cur);
  // Apply the filter when the handle is released (not on every pixel of the drag).
  const commit = (e: React.SyntheticEvent<HTMLInputElement>) => e.currentTarget.form?.requestSubmit();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }} aria-live="polite">
        {minVal ? fmt(minVal) : "Any"} – {maxVal ? fmt(maxVal) : "No max"}{perMonth ? " /mo" : ""}
      </div>
      <div style={{ position: "relative", height: 28 }}>
        <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: 12, height: 4, borderRadius: 4, background: "#d9d6ce" }} />
        <div aria-hidden="true" style={{ position: "absolute", top: 12, height: 4, borderRadius: 4, background: "var(--red)", left: `${lo / 10}%`, width: `${Math.max(hi - lo, 0) / 10}%` }} />
        <input className="rng" type="range" min={0} max={1000} value={lo} aria-label="Minimum price"
          onChange={(e) => { e.stopPropagation(); setLo(Math.min(Number(e.target.value), hi - 10)); }} onPointerUp={commit} onKeyUp={commit} />
        <input className="rng" type="range" min={0} max={1000} value={hi} aria-label="Maximum price"
          onChange={(e) => { e.stopPropagation(); setHi(Math.max(Number(e.target.value), lo + 10)); }} onPointerUp={commit} onKeyUp={commit} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span>{fmt(0)}</span><span>{fmt(top)}+</span></div>
      <input type="hidden" name="min" value={minVal ?? ""} />
      <input type="hidden" name="max" value={maxVal ?? ""} />
    </div>
  );
}
