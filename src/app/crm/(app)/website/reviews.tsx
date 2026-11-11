"use client";
import { useActionState, useState, useTransition } from "react";
import { saveReview, setReviewShown, type ReviewState } from "./actions";

export interface ReviewRow { id: string; reviewer_name: string; rating: number; body: string; review_date: string | null; is_published: boolean; sort_order: number }

function ReviewForm({ r, onDone }: { r?: ReviewRow; onDone?: () => void }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(async (p, f) => { const res = await saveReview(p, f); if (res.ok) onDone?.(); return res; }, {});
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {r && <input type="hidden" name="id" value={r.id} />}
      <div className="form-grid">
        <div className="field"><label htmlFor={`rn-${r?.id ?? "new"}`}>Reviewer name *</label><input id={`rn-${r?.id ?? "new"}`} name="reviewer_name" defaultValue={r?.reviewer_name} required /></div>
        <div className="field"><label htmlFor={`rr-${r?.id ?? "new"}`}>Stars</label>
          <select id={`rr-${r?.id ?? "new"}`} name="rating" defaultValue={String(r?.rating ?? 5)}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}</select>
        </div>
        <div className="field"><label htmlFor={`rd-${r?.id ?? "new"}`}>Review date</label><input id={`rd-${r?.id ?? "new"}`} name="review_date" type="date" defaultValue={r?.review_date ?? ""} /></div>
        <div className="field"><label htmlFor={`ro-${r?.id ?? "new"}`}>Order (lower shows first)</label><input id={`ro-${r?.id ?? "new"}`} name="sort_order" inputMode="numeric" defaultValue={r?.sort_order ?? 100} /></div>
        <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor={`rb-${r?.id ?? "new"}`}>Review text * (copy it exactly from Google)</label><textarea id={`rb-${r?.id ?? "new"}`} name="body" rows={4} defaultValue={r?.body} required /></div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button className="btn btn-sm" type="submit" disabled={pending}>{pending ? "Saving…" : r ? "Save review" : "Add review"}</button>
        {onDone && <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button>}
        {state.ok && !r && <span className="muted" role="status">Added. It shows on the website within a minute.</span>}
        {state.error && <span className="error" role="alert">{state.error}</span>}
      </div>
    </form>
  );
}

export function ReviewsManager({ rows }: { rows: ReviewRow[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {rows.map((r) => (
        <div key={r.id} className="panel" style={{ margin: 0, opacity: r.is_published ? 1 : 0.6, display: "flex", flexDirection: "column", gap: 8 }}>
          {editing === r.id ? <ReviewForm r={r} onDone={() => setEditing(null)} /> : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                <strong style={{ color: "var(--ink)" }}>{r.reviewer_name} · {"★".repeat(r.rating)}{r.review_date ? <span className="muted" style={{ fontWeight: 400 }}> · {r.review_date}</span> : null}</strong>
                <span style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(r.id)}>Edit</button>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => start(async () => { await setReviewShown(r.id, !r.is_published); })}>{r.is_published ? "Hide from website" : "Show on website"}</button>
                </span>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 14, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.body}</p>
            </>
          )}
        </div>
      ))}
      <details className="panel" style={{ margin: 0 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--ink)" }}>+ Add a review</summary>
        <div style={{ marginTop: 12 }}><ReviewForm /></div>
      </details>
    </div>
  );
}
