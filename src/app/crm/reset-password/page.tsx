"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Step = "loading" | "no-session" | "form" | "done";
const MIN = 12;

// Reached from the emailed reset link. People with 2FA confirm their code first (/mfa sends them back here),
// because Supabase only lets a fully verified session change the password.
export default function ResetPasswordPage() {
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const sb = () => (clientRef.current ??= createClient());
  const [step, setStep] = useState<Step>("loading");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb().auth.getUser();
      if (!user) return setStep("no-session");
      const { data: aal } = await sb().auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        window.location.replace("/mfa/?next=/reset-password/");
        return;
      }
      setStep("form");
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < MIN) return setError(`Use at least ${MIN} characters.`);
    if (pw !== pw2) return setError("The two passwords don't match.");
    setBusy(true);
    const { error } = await sb().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      if (/same|different from the old/i.test(error.message)) return setError("Choose a password you haven't used here before.");
      if (/weak|pwned|leaked|characters/i.test(error.message)) return setError("That password is too easy to guess. Try a longer one.");
      if (/aal2|insufficient/i.test(error.message)) { window.location.replace("/mfa/?next=/reset-password/"); return; }
      return setError("Couldn't save the new password. Request a fresh reset link and try again.");
    }
    setStep("done");
  }

  return (
    <main className="auth-page">
      <form onSubmit={submit} className="card auth-card">
        <div className="logo">AXE <span>| realty</span></div>
        {step === "loading" && <p className="muted">Loading…</p>}
        {step === "no-session" && (
          <>
            <h1 style={{ fontSize: 24 }}>This reset link has expired</h1>
            <p className="muted">Links work once and only in the browser that asked for them.</p>
            <Link className="btn" href="/login/forgot">Send a new link</Link>
          </>
        )}
        {step === "form" && (
          <>
            <h1 style={{ fontSize: 24 }}>Choose a new password</h1>
            <p className="muted">At least {MIN} characters. A short phrase is easier to remember than a jumble.</p>
            <div className="field">
              <label htmlFor="new-password">New password</label>
              <input id="new-password" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="confirm-password">Type it again</label>
              <input id="confirm-password" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
            </div>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="btn" type="submit" disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
          </>
        )}
        {step === "done" && (
          <>
            <h1 style={{ fontSize: 24 }}>Password changed</h1>
            <p className="muted">You&apos;re signed in. Use the new password next time.</p>
            <Link className="btn" href="/">Open the CRM</Link>
          </>
        )}
      </form>
    </main>
  );
}
