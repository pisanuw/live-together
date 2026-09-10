import Link from "next/link";
import { redirect } from "next/navigation";

import { ItemRow } from "@/components/info/item-row";
import { SectionHeader } from "@/components/info/section-header";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/context";
import { isManagerRole } from "@/lib/auth/types";
import { listInfo } from "@/lib/info/queries";

import { createItem, createSection } from "../actions";

const inputClass =
  "border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export default async function ManageInfoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const viewer = await getViewer();
  const membership = viewer.activeMembership!;
  if (!isManagerRole(membership.role)) redirect("/info");

  const sections = await listInfo(membership.building_id);

  return (
    <div className="max-w-2xl space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit info desk</h1>
          <p className="text-muted-foreground text-sm">
            Manage the sections and items residents see.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/info">Done</Link>
        </Button>
      </header>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {sections.map(({ section, items }) => (
        <section key={section.id} className="space-y-3">
          <SectionHeader sectionId={section.id} title={section.title} />

          {items.length ? (
            <div className="space-y-2">
              {items.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No items yet.</p>
          )}

          <details className="rounded-lg border border-dashed">
            <summary className="text-muted-foreground hover:text-foreground cursor-pointer px-4 py-2 text-sm">
              + Add item
            </summary>
            <form action={createItem} className="space-y-3 p-4 pt-0">
              <input type="hidden" name="sectionId" value={section.id} />
              <input
                name="title"
                required
                maxLength={200}
                placeholder="Title (e.g. Front desk)"
                className={inputClass}
              />
              <textarea
                name="body"
                rows={3}
                maxLength={5000}
                placeholder="Details — markdown: **bold**, *italic*, - lists, [links](https://…)"
                className={inputClass}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="phone"
                  maxLength={40}
                  placeholder="Phone (optional)"
                  className={inputClass}
                />
                <input
                  name="url"
                  maxLength={300}
                  placeholder="Link (optional)"
                  className={inputClass}
                />
              </div>
              <SubmitButton size="sm" pendingText="Adding…">
                Add item
              </SubmitButton>
            </form>
          </details>
        </section>
      ))}

      <section className="space-y-3 border-t pt-6">
        <h2 className="text-sm font-semibold">Add a section</h2>
        <form action={createSection} className="flex flex-wrap gap-2">
          <input
            name="title"
            required
            maxLength={120}
            placeholder="Section name (e.g. Parking)"
            className={`${inputClass} min-w-56 flex-1`}
          />
          <SubmitButton size="sm" pendingText="Adding…">
            Add section
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
