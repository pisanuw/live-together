import type { Category } from "@/lib/forum/types";

/** A small colored pill for a forum category tag. */
export function CategoryBadge({ category }: { category: Category }) {
  const color = category.color ?? "#64748b";
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
      style={{
        color,
        borderColor: `${color}66`,
        backgroundColor: `${color}14`,
      }}
    >
      {category.label}
    </span>
  );
}
