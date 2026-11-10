"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { href: string; label: string; admin?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/viewings", label: "Viewings" },
  { href: "/properties", label: "Properties" },
  { href: "/owners", label: "Owners" },
  { href: "/developments", label: "Developments" },
  { href: "/locations", label: "Locations" },
  { href: "/closings", label: "Closings", admin: true },
  { href: "/commissions", label: "Commissions", admin: true },
  { href: "/website", label: "Website" },
];

export function NavLinks({ admin = false }: { admin?: boolean }) {
  const path = usePathname();
  return (
    <nav className="nav">
      {ITEMS.filter((i) => !i.admin || admin).map((i) => {
        const on = path === i.href || path.startsWith(`${i.href}/`);
        return (
          <Link key={i.href} href={i.href} className={`nav-item${on ? " nav-active" : ""}`} aria-current={on ? "page" : undefined}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
