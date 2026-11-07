"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step = { kind: "loading" } | { kind: "enrol"; factorId: string; qr: string; secret: string } | { kind: "verify"; factorId: string };

// Two-factor authentication with an authenticator app (TOTP).
// Required for Super Admins; the database ignores a Super Admin session without it.
export default function MfaPage() {
  // Created on first use in the browser, never during server prerender.
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const sb = () => (clientRef.current ??= createClient());
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await sb().auth.mfa.listFactors();
      if (error) return setError(error.message);
      const verified = data.totp.find((f) => f.status === "verified");
      if (verified) return setStep({ kind: "verify", factorId: verified.id });

      // Clear half-finished enrolments, then start a fresh one.
      for (const f of data.all.filter((f) => f.status !== "verified")) {
        await sb().auth.mfa.unenroll({ factorId: f.id });
      }
      const enrol = await sb().auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator app" });
      if (enrol.error) return setError(enrol.error.message);
      setStep({ kind: "enrol", factorId: enrol.data.id, qr: enrol.data.totp.qr_code, secret: enrol.data.totp.secret });
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step.kind === "loading") return;
    setBusy(true);
    setError(null);
    const { error } = await sb().auth.mfa.challengeAndVerify({ factorId: step.factorId, code: code.trim() });
    setBusy(false);
    if (error) return setError("That code didn't work. Check the time on your phone and try the newest code.");
    // Back to where the person was heading (e.g. the password reset), own pages only.
    const next = new URLSearchParams(window.location.search).get("next") ?? "/";
    router.replace(next.startsWith("/") && !next.startsWith("//") ? next : "/");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <form onSubmit={submit} className="card auth-card">
        <div className="logo">AXE <span>| realty</span></div>
        {step.kind === "loading" && <p className="muted">Loading…</p>}
        {step.kind === "enrol" && (
          <>
            <h1 style={{ fontSize: 24 }}>Set up two-factor sign-in</h1>
            <p className="muted">
              Scan this with Google Authenticator, Microsoft Authenticator or 1Password, then enter the 6-digit code.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={step.qr} alt="QR code for your authenticator app" width={180} height={180} style={{ background: "#fff", padding: 8, borderRadius: 8 }} />
            <p className="muted" style={{ fontSize: 13, wordBreak: "break-all" }}>
              Can&apos;t scan? Enter this key: <code>{step.secret}</code>
            </p>
          </>
        )}
        {step.kind === "verify" && (
          <>
            <h1 style={{ fontSize: 24 }}>Enter your 6-digit code</h1>
            <p className="muted">Open your authenticator app and type the current code for Axe Realty.</p>
          </>
        )}
        {step.kind !== "loading" && (
          <>
            <div className="field">
              <label htmlFor="code">Code</label>
              <input id="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6}
                value={code} onChange={(e) => setCode(e.target.value)} required />
            </div>
            <button className="btn" type="submit" disabled={busy || code.length !== 6}>
              {busy ? "Checking…" : "Verify"}
            </button>
          </>
        )}
        {error && <p className="error" role="alert">{error}</p>}
      </form>
    </main>
  );
}
