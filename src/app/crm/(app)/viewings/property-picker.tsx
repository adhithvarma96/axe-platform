"use client";
import { useMemo, useState } from "react";
import type { PropertyOption } from "./viewing-form";

/** Search listings by listing no, development or building, tower, unit, area, owner or "2 bed",
 *  with enough detail on each row to pick the right unit without leaving the form. */
export function PropertyPicker({ options, defaultValue }: { options: PropertyOption[]; defaultValue: string }) {
  const initial = options.find((p) => defaultValue && defaultValue.startsWith(p.no)) ?? null;
  const [picked, setPicked] = useState<PropertyOption | null>(initial);
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return options.filter((p) => words.every((w) => p.search.includes(w))).slice(0, 40);
  }, [q, options]);

  return (
    <div className="picker">
      <input type="hidden" name="property" value={picked ? `${picked.no} – ${picked.label}` : ""} />
      {picked ? (
        <div className="picker-row picked">
          <Row p={picked} />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setPicked(null); setQ(""); }}>Change</button>
        </div>
      ) : (
        <>
          <input id="property" type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off"
            placeholder="Search listing no, development, building, unit, owner, area or “2 bed”" aria-describedby="property-help" />
          <small id="property-help" className="muted">
            {q ? `${results.length === 40 ? "40+" : results.length} match${results.length === 1 ? "" : "es"}${results.length ? ", available first" : ""}` : `${options.length.toLocaleString()} listings. Combine words, e.g. “cinnamon 3 bed” or an owner's name.`}
          </small>
          {results.length > 0 && (
            <ul className="picker-list" role="listbox" aria-label="Matching properties">
              {results.map((p) => (
                <li key={p.no}>
                  <button type="button" role="option" aria-selected={false} className="picker-row" onClick={() => setPicked(p)}><Row p={p} /></button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function Row({ p }: { p: PropertyOption }) {
  return (
    <span className="picker-text">
      <span><b>{p.no}</b> · {p.title} <span className={`badge${p.rank === 0 ? " badge-ok" : ""}`}>{p.status}</span></span>
      {p.facts && <span className="muted">{p.facts}</span>}
      {p.owner && <span className="muted">Owner: {p.owner}</span>}
    </span>
  );
}
