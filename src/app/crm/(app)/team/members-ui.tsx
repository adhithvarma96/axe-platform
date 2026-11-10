"use client";
import { useActionState, useState, useTransition } from "react";
import { addMember, sendLoginLink, setMemberStatus, type MemberState } from "./members";
import { ROLE_LABELS } from "./roles";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function LinkResult({ r }: { r: MemberState }) {
  const [copied, setCopied] = useState<string | null>(null);
  if (!r.link) return null;
  const first = (r.name ?? "").split(" ")[0];
  const msg = `Hi ${first}, here is your login for Axe Realty OS. Open it to set your password (works once, within 24 hours):\n${r.link}`;
  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); } catch { setCopied("fail"); }
  };
  return (
    <div className="panel" role="status" style={{ background: "var(--card)", display: "flex", flexDirection: "column", gap: 8, margin: 0 }}>
      <strong style={{ color: "var(--ink)" }}>Login link for {r.name}{r.emailed ? " (also emailed to them)" : ""}</strong>
      <span className="muted" style={{ fontSize: 13 }}>Send it to them on WhatsApp. It works once and expires in 24 hours; make a new one any time.</span>
      <input readOnly value={r.link} onFocus={(e) => e.currentTarget.select()} aria-label="Login link" style={{ fontSize: 12 }} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className="btn btn-sm" onClick={() => copy(msg, "msg")}>Copy WhatsApp message</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy(r.link!, "link")}>Copy link only</button>
        {copied && <span className="muted" style={{ fontSize: 13 }}>{copied === "fail" ? "Couldn't copy; select the link above." : "Copied."}</span>}
      </div>
    </div>
  );
}

export function AddMember() {
  const [state, action, pending] = useActionState<MemberState, FormData>(addMember, {});
  return (
    <details className="panel" open={state.link || state.error ? true : undefined}>
      <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--ink)" }}>+ Add team member</summary>
      <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
        <div className="form-grid">
          <div className="field"><label htmlFor="nm-name">Full name *</label><input id="nm-name" name="full_name" required /></div>
          <div className="field"><label htmlFor="nm-email">Work email * (their login)</label><input id="nm-email" name="work_email" type="email" required placeholder="name@axerealty.lk" /></div>
          <div className="field"><label htmlFor="nm-role">Role</label>
            <select id="nm-role" name="role" defaultValue="agent">{ROLE_LABELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </div>
          <div className="field"><label htmlFor="nm-phone">Personal phone</label><input id="nm-phone" name="personal_phone" type="tel" placeholder="+94…" /></div>
          <div className="field"><label htmlFor="nm-day">Day off</label>
            <select id="nm-day" name="weekly_day_off" defaultValue=""><option value="">None</option>{DAYS.map((d) => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>)}</select>
          </div>
          <div className="field"><label htmlFor="nm-joined">Date joined</label><input id="nm-joined" name="date_joined" type="date" /></div>
          <div className="field"><label htmlFor="nm-prob">Probation ends</label><input id="nm-prob" name="probation_end_date" type="date" /></div>
        </div>
        <small className="muted">Saving creates their login and gives you a one-time link to send them. Set their targets on their card below afterwards.</small>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-sm" type="submit" disabled={pending}>{pending ? "Adding…" : "Add and create login link"}</button>
          {state.error && <span className="error" role="alert" style={{ margin: 0 }}>{state.error}</span>}
        </div>
        <LinkResult r={state} />
      </form>
    </details>
  );
}

export function MemberAccess({ id, active, hasLogin, isMe }: { id: string; active: boolean; hasLogin: boolean; isMe: boolean }) {
  const [r, setR] = useState<MemberState>({});
  const [pending, start] = useTransition();
  const run = (f: () => Promise<MemberState>) => start(async () => setR(await f()));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span className="badge">{hasLogin ? "Has a login" : "No login yet"}</span>
        {active && <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(() => sendLoginLink(id))}>{hasLogin ? "Password reset link" : "Create login link"}</button>}
        {!isMe && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={pending}
            onClick={() => run(() => setMemberStatus(id, !active))}>{active ? "Deactivate (blocks sign-in)" : "Reactivate"}</button>
        )}
        {r.error && <span className="error" role="alert" style={{ margin: 0 }}>{r.error}</span>}
      </div>
      <LinkResult r={r} />
    </div>
  );
}
