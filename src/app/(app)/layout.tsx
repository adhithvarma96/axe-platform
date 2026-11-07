import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { signOut } from "../login/actions";
import { NavLinks } from "./nav-links";

// Authenticated app shell: white side menu with the red active state from the approved wireframe.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Main menu">
        <Link href="/properties" className="logo" style={{ textDecoration: "none" }}>
          AXE <span>| realty</span>
        </Link>
        <Suspense fallback={<nav className="nav" />}>
          <NavLinks />
        </Suspense>
        <Suspense fallback={null}>
          <UserBox />
        </Suspense>
      </aside>
      <div className="main">{children}</div>
    </div>
  );
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
      <form action={signOut}>
        <button className="btn btn-ghost btn-sm" type="submit">Sign out</button>
      </form>
    </div>
  );
}
