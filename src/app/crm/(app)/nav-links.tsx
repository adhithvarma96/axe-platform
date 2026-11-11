"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { href: string; label: string; admin?: boolean; superOnly?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/notifications", label: "Notifications" },
  { href: "/leads", label: "Leads" },
  { href: "/viewings", label: "Viewings" },
  { href: "/properties", label: "Properties" },
  { href: "/owners", label: "Owners" },
  { href: "/marketing-leads", label: "Marketing leads" },
  { href: "/external-agents", label: "External agents" },
  { href: "/referral-partners", label: "Referral partners" },
  { href: "/developments", label: "Developments" },
  { href: "/locations", label: "Locations" },
  { href: "/closings", label: "Closings", admin: true },
  { href: "/commissions", label: "Commissions", admin: true },
  { href: "/team", label: "Team & targets", admin: true },
  { href: "/website", label: "Website", superOnly: true },
  { href: "/bin", label: "Deleted bin", superOnly: true },
];

export function NavLinks({ admin = false, superAdmin = false, unread = 0 }: { admin?: boolean; superAdmin?: boolean; unread?: number }) {
  const path = usePathname();
  return (
    <>
      <form action="/search" role="search" className="nav-search">
        <label htmlFor="nav-q" className="sr-only">Search everything</label>
        <input id="nav-q" name="q" placeholder="Search… (/)" autoComplete="off"
          onKeyDown={(e) => { if (e.key === "Escape") (e.target as HTMLInputElement).blur(); }} />
      </form>
      <nav className="nav">
        {ITEMS.filter((i) => (!i.admin || admin) && (!i.superOnly || superAdmin)).map((i) => {
          const on = path === i.href || path.startsWith(`${i.href}/`);
          return (
            <Link key={i.href} href={i.href} className={`nav-item${on ? " nav-active" : ""}`} aria-current={on ? "page" : undefined}>
              {i.label}
              {i.href === "/notifications" && unread > 0 && <span className="nav-count" aria-label={`${unread} unread`}>{unread > 99 ? "99+" : unread}</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
