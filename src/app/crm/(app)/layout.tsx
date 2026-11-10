import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { SignOutButton } from "../sign-out-button";
import { NavLinks } from "./nav-links";

// Authenticated app shell: white side menu with the red active state from the approved wireframe.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Main menu">
        <Link href="/dashboard" className="logo" style={{ textDecoration: "none" }}>
          AXE <span>| realty</span>
        </Link>
        <Suspense fallback={<nav className="nav" />}>
          <Nav />
        </Suspense>
        <Suspense fallback={null}>
          <UserBox />
        </Suspense>
      </aside>
      <div className="main">{children}</div>
    </div>
  );
}

/** Closings and Commissions appear only for the Super Admin (and a future Sales Manager, read-only). */
async function Nav() {
  await connection();
  const user = await requireUser();
  return <NavLinks admin={user.role === "super_admin" || user.role === "sales_manager"} />;
}

async function UserBox() {
  await connection();
  const user = await requireUser();
  return (
    <div className="userbox">
      <div>
        <div style={{ fontWeight: 600, color: "var(--ink)" }}>{user.fullName}</div>
        <div className="muted" style={{ fontSize: 12 }}>{user.role.replace("_", " ")}</div>
      </div>
      <SignOutButton />
    </div>
  );
}
