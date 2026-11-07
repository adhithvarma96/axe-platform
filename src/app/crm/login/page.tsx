"use client";
import { useActionState, useEffect } from "react";
import Link from "next/link";
import { signIn, type SignInState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});
  useEffect(() => { if (state.next) window.location.assign(state.next); }, [state.next]);

  return (
    <main className="auth-page">
      <form action={action} className="card auth-card">
        <div className="logo">AXE <span>| realty</span></div>
        <h1 style={{ fontSize: 26 }}>Sign in</h1>
        <div className="field">
          <label htmlFor="email">Work email</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {state.error && <p className="error" role="alert">{state.error}</p>}
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
        <Link href="/login/forgot" className="muted" style={{ fontSize: 14 }}>Forgot password?</Link>
      </form>
    </main>
  );
}
