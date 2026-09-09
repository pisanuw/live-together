import Link from "next/link";
import { cn } from "cn";

import type { Category } from "@/lib/forum/types";

/**
 * Filter chips for the forum feed. Each links to `/forum?category=slug`;
 * "All" clears the filter. Active state is driven by `activeSlug`.
 */
export function CategoryFilter({
  categories,
  activeSlug,
}: {
  categories: Category[];
  activeSlug?: string;
}) {
  const chip = (
    href: string,
    label: string,
    active: boolean,
    color?: string
  ) => (
    <Link
      key={href}
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
        active
          ? "bg-foreground text-background border-transparent"
          : "text-muted-foreground hover:bg-muted/60"
      )}
      style={!active && color ? { borderColor: `${color}66` } : undefined}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex flex-wrap gap-1.5">
      {chip("/forum", "All", !activeSlug)}
      {categories.map((c) =>
        chip(
          `/forum?category=${c.slug}`,
          c.label,
          activeSlug === c.slug,
          c.color ?? undefined
        )
      )}
    </div>
  );
}
