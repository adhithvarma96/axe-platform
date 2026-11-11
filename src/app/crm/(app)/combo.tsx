"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface ComboOption { id: string; name: string; hint?: string; search?: string }

/**
 * A select you can type into: filters as you type (every word must match), arrow keys
 * and Enter to pick, Escape to close. Submits the chosen id under `name` like a <select>.
 */
export function Combo({ name, id, options, defaultValue = "", value: controlled, onChange, placeholder = "Type to search…", emptyLabel = "—",
  disabled, required, allowEmpty = true, footer, max = 60 }: {
  name: string; id?: string; options: ComboOption[]; defaultValue?: string; value?: string; onChange?: (id: string) => void;
  placeholder?: string; emptyLabel?: string; disabled?: boolean; required?: boolean; allowEmpty?: boolean;
  footer?: React.ReactNode; max?: number;
}) {
  const auto = useId();
  const inputId = id ?? `combo-${auto}`;
  const [inner, setInner] = useState(defaultValue);
  const value = controlled ?? inner;
  const picked = options.find((o) => o.id === value) ?? null;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hay = (o: ComboOption) => (o.search ?? `${o.name} ${o.hint ?? ""}`).toLowerCase();
    const hits = words.length ? options.filter((o) => words.every((w) => hay(o).includes(w))) : options;
    // names that start with the query first
    if (words.length) hits.sort((a, b) => Number(!a.name.toLowerCase().startsWith(words[0])) - Number(!b.name.toLowerCase().startsWith(words[0])));
    return hits.slice(0, max);
  }, [q, options, max]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) { setOpen(false); setQ(""); } };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  useEffect(() => { list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" }); }, [active]);

  const choose = (idv: string) => {
    if (controlled === undefined) setInner(idv);
    onChange?.(idv);
    setOpen(false);
    setQ("");
  };
  const rows: (ComboOption | null)[] = allowEmpty && !q ? [null, ...results] : results;

  return (
    <div className="combo" ref={box}>
      <input type="hidden" name={name} value={value} />
      <input
        id={inputId}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${inputId}-list`}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        required={required && !value}
        value={open ? q : picked?.name ?? ""}
        placeholder={open ? (picked?.name ?? placeholder) : picked ? "" : allowEmpty ? emptyLabel === "—" ? placeholder : emptyLabel : placeholder}
        onFocus={() => { setOpen(true); setActive(0); }}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(rows.length - 1, a + 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
          else if (e.key === "Enter" && open) { e.preventDefault(); const r = rows[active]; if (r !== undefined) choose(r?.id ?? ""); }
          else if (e.key === "Escape") { setOpen(false); setQ(""); }
        }}
      />
      {open && !disabled && (
        <ul className="combo-list" role="listbox" id={`${inputId}-list`} ref={list}>
          {rows.map((o, i) => (
            <li key={o?.id ?? "__empty"} role="option" aria-selected={(o?.id ?? "") === value} data-i={i}
              className={`combo-opt${i === active ? " on" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); choose(o?.id ?? ""); }} onMouseEnter={() => setActive(i)}>
              {o ? <><span>{o.name}</span>{o.hint && <small className="muted">{o.hint}</small>}</> : <span className="muted">{emptyLabel === "—" ? "None" : emptyLabel}</span>}
            </li>
          ))}
          {!results.length && <li className="combo-none muted">No match for “{q}”</li>}
          {results.length === max && <li className="combo-none muted">Showing the first {max}. Type more to narrow it down.</li>}
          {footer && <li className="combo-footer" onMouseDown={(e) => e.preventDefault()}>{footer}</li>}
        </ul>
      )}
    </div>
  );
}
