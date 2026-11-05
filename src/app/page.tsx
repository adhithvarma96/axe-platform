import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient, getCurrentUser, needsMfa } from "@/lib/supabase/server";
import { signOut } from "./login/actions";

// Phase 0 home: proves sign-in, 2FA and row-level security end to end.
// The real dashboard arrives in Phase 2.
export default function Home() {
  return (
    <main className="auth-page">
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <SignedInHome />
      </Suspense>
    </main>
  );
}

async function SignedInHome() {
  await connection(); // per-request: the session and token expiry depend on the current time
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (needsMfa(user)) redirect("/mfa");

  const supabase = await createClient();
  const checks = await Promise.all(
    ["properties", "leads", "owners", "closings", "commission_receipts", "audit_log"].map(async (table) => {
      const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
      return { table, count: error ? null : count ?? 0, error: error?.message };
    }),
  );

  return (
      <section className="card" style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="logo">AXE <span>| realty</span></div>
        <h1 style={{ fontSize: 26 }}>Foundations are live</h1>
        {user.role ? (
          <p>
            Signed in as <strong>{user.fullName}</strong> ({user.role.replace("_", " ")}), 2FA{" "}
            {user.aal === "aal2" ? "verified" : "not used"}.
          </p>
        ) : (
          <p className="error">
            Your login works, but it isn&apos;t linked to an active team member yet. Ask the Super Admin to add you.
          </p>
        )}
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>What the database lets you see</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <tbody>
              {checks.map((c) => (
                <tr key={c.table} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "6px 0" }}>{c.table.replace("_", " ")}</td>
                  <td style={{ padding: "6px 0", textAlign: "right" }} className="muted">
                    {c.error ? "no access" : `${c.count} rows visible`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form action={signOut}>
          <button className="btn btn-ghost" type="submit">Sign out</button>
        </form>
      </section>
  );
}
