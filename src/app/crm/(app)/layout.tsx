import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SlashToSearch } from "./slash-search";
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
      <SlashToSearch />
    </div>
  );
}

/** Closings and Commissions appear only for the Super Admin (and a future Sales Manager, read-only). */
async function Nav() {
  await connection();
  const user = await requireUser();
  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true })
    .eq("recipient_agent_id", user.agentId ?? "00000000-0000-0000-0000-000000000000").is("read_at", null).is("deleted_at", null);
  return <NavLinks admin={user.role === "super_admin" || user.role === "sales_manager"} superAdmin={user.role === "super_admin"} unread={count ?? 0} />;
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
