import { SignOutButton } from "../sign-out-button";

export default function NoAccess() {
  return (
    <main className="auth-page">
      <section className="card auth-card">
        <div className="logo">AXE <span>| realty</span></div>
        <h1 style={{ fontSize: 24 }}>Your login isn&apos;t linked to the team yet</h1>
        <p className="muted">Ask the Super Admin to add you as a team member, then sign in again.</p>
        <SignOutButton className="btn btn-ghost" />
      </section>
    </main>
  );
}
