"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/forum", label: "Forum" },
  { href: "/info", label: "Info Desk" },
  { href: "/events", label: "Events" },
  { href: "/my-events", label: "My Events" },
  { href: "/maintenance", label: "Maintenance" },
  { href: "/settings", label: "Settings" },
];

export function AppNav({ canManage }: { canManage: boolean }) {
  const pathname = usePathname();
  const links = canManage
    ? [...LINKS, { href: "/manage", label: "Manage" }]
    : LINKS;

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 md:w-44 md:flex-col md:overflow-visible md:pb-0">
      {links.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
              active
                ? "bg-muted text-foreground font-medium"
                : "text-muted-foreground hover:bg-muted/60"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
