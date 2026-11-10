"use client";
import { useState, useTransition } from "react";
import { addTask, logActivity, setTaskDone } from "../actions";

/** Quick log: call / WhatsApp / email / meeting / note. */
export function ActivityLog({ leadId }: { leadId: string }) {
  const [type, setType] = useState("whatsapp");
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await logActivity(leadId, type, text); if (r.ok) setText(""); setErr(r.error ?? null); }); }}
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      <div className="chips" role="radiogroup" aria-label="Type">
        {[["whatsapp", "WhatsApp"], ["call", "Call"], ["email", "Email"], ["meeting", "Meeting"], ["note", "Note"]].map(([k, l]) => (
          <button key={k} type="button" role="radio" aria-checked={type === k} className={`chip-btn${type === k ? " on" : ""}`} onClick={() => setType(k)}>{l}</button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="act" className="sr-only">What happened</label>
        <textarea id="act" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="What was said or agreed" />
      </div>
      {err && <p className="error" style={{ margin: 0 }}>{err}</p>}
      <button className="btn btn-sm" type="submit" disabled={pending || !text.trim()} style={{ alignSelf: "flex-start" }}>{pending ? "Saving…" : "Log it"}</button>
    </form>
  );
}

export function TaskDone({ id, done }: { id: string; done: boolean }) {
  const [pending, start] = useTransition();
  return (
    <input type="checkbox" aria-label={done ? "Mark as open" : "Mark as done"} checked={done} disabled={pending}
      onChange={(e) => start(async () => { await setTaskDone(id, e.target.checked); })}
      style={{ width: 18, height: 18, accentColor: "var(--red)", flexShrink: 0 }} />
  );
}

export function AddTask({ leadId }: { leadId: string }) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [pending, start] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await addTask(leadId, title, due || null); if (r.ok) { setTitle(""); setDue(""); } }); }}
      style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
      <div className="field" style={{ flex: "2 1 180px" }}>
        <label htmlFor="task">New follow-up</label>
        <input id="task" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Send 3 options in Colombo 3" />
      </div>
      <div className="field" style={{ flex: "1 1 130px" }}>
        <label htmlFor="due">Due</label>
        <input id="due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      </div>
      <button className="btn btn-ghost btn-sm" type="submit" disabled={pending || !title.trim()}>Add</button>
    </form>
  );
}

export function CopyText({ text, label = "Copy requirement for WhatsApp" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button className="btn btn-ghost btn-sm" type="button"
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); } catch { setDone(false); } }}>
      {done ? "Copied" : label}
    </button>
  );
}
