"use client";
import { useActionState, useSyncExternalStore } from "react";
import Link from "next/link";
import { requestReset, type ResetState } from "./actions";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<ResetState, FormData>(requestReset, {});
  // ?expired=1 when an old or used reset link brought them here (read on the client only).
  const expired = useSyncExternalStore(() => () => {}, () => new URLSearchParams(window.location.search).has("expired"), () => false);

  return (
    <main className="auth-page">
      <form action={action} className="card auth-card">
        <div className="logo">AXE <span>| realty</span></div>
        <h1 style={{ fontSize: 26 }}>Reset your password</h1>
        {state.sent ? (
          <>
            <p role="status">
              If that email has an account, a reset link is on its way. Open it on this device and browser; it works once
              and expires in an hour.
            </p>
            <p className="muted" style={{ fontSize: 14 }}>Nothing after a few minutes? Check spam, then try again.</p>
          </>
        ) : (
          <>
            {expired && <p className="error" role="alert">That link has expired or was already used. Send a new one.</p>}
            <p className="muted">Enter your work email and we&apos;ll send you a link to choose a new password.</p>
            <div className="field">
              <label htmlFor="email">Work email</label>
              <input id="email" name="email" type="email" autoComplete="username" required />
            </div>
            {state.error && <p className="error" role="alert">{state.error}</p>}
            <button className="btn" type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send reset link"}
            </button>
          </>
        )}
        <Link href="/login" className="muted" style={{ fontSize: 14 }}>Back to sign in</Link>
      </form>
    </main>
  );
}
