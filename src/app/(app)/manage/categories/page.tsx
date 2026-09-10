import Link from "next/link";
import { redirect } from "next/navigation";

import { CategoryBadge } from "@/components/forum/category-badge";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/context";
import { listCategories } from "@/lib/forum/queries";

import { createCategory, deleteCategory, updateCategory } from "./actions";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const viewer = await getViewer();
  const active = viewer.activeMembership!;
  if (active.role !== "admin") redirect("/manage");

  const categories = await listCategories(active.building_id);

  return (
    <div className="max-w-2xl space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Forum categories</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/manage">Back</Link>
        </Button>
      </header>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <ul className="space-y-2">
        {categories.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border p-3"
          >
            <CategoryBadge category={c} />
            <form
              action={updateCategory}
              className="flex flex-1 flex-wrap items-center gap-2"
            >
              <input type="hidden" name="categoryId" value={c.id} />
              <input
                type="color"
                name="color"
                defaultValue={c.color ?? "#64748b"}
                className="h-8 w-10 rounded border"
                aria-label="Color"
              />
              <input
                name="label"
                defaultValue={c.label}
                maxLength={60}
                className="border-input bg-background h-8 min-w-40 flex-1 rounded-md border px-2 text-sm"
              />
              <SubmitButton size="xs" variant="outline" pendingText="…">
                Save
              </SubmitButton>
            </form>
            <form action={deleteCategory}>
              <input type="hidden" name="categoryId" value={c.id} />
              <SubmitButton size="xs" variant="ghost" pendingText="…">
                Delete
              </SubmitButton>
            </form>
          </li>
        ))}
      </ul>

      <section className="space-y-3 border-t pt-6">
        <h2 className="text-sm font-semibold">Add a category</h2>
        <form
          action={createCategory}
          className="flex flex-wrap items-center gap-2"
        >
          <input
            type="color"
            name="color"
            defaultValue="#64748b"
            className="h-9 w-10 rounded border"
            aria-label="Color"
          />
          <input
            name="label"
            required
            maxLength={60}
            placeholder="Category name"
            className="border-input bg-background h-9 min-w-48 flex-1 rounded-md border px-3 text-sm"
          />
          <SubmitButton size="sm" pendingText="Adding…">
            Add
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
