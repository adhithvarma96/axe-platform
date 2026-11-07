"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { href: string; label: string; soon?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", soon: true },
  { href: "/leads", label: "Leads", soon: true },
  { href: "/properties", label: "Properties" },
  { href: "/viewings", label: "Viewings", soon: true },
  { href: "/owners", label: "Owners" },
  { href: "/developments", label: "Developments" },
  { href: "/locations", label: "Locations" },
  { href: "/website", label: "Website" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="nav">
      {ITEMS.map((i) =>
        i.soon ? (
          <span key={i.href} className="nav-item nav-soon" title="Arrives in Phase 2">
            {i.label}
            <small>Phase 2</small>
          </span>
        ) : (
          <Link key={i.href} href={i.href} className={`nav-item${path.startsWith(i.href) ? " nav-active" : ""}`} aria-current={path.startsWith(i.href) ? "page" : undefined}>
            {i.label}
          </Link>
        ),
      )}
    </nav>
  );
}
