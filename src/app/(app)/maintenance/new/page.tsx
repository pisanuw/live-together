import Link from "next/link";

import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_OPTIONS,
  categoryLabel,
  PRIORITY_OPTIONS,
  priorityLabel,
} from "@/lib/maintenance/helpers";
import { MAX_IMAGES_PER_REQUEST } from "@/lib/maintenance/media";

import { createRequest } from "../actions";

const inputClass =
  "border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="max-w-2xl space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">New request</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/maintenance">Cancel</Link>
        </Button>
      </header>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <form action={createRequest} className="space-y-5">
        <div className="space-y-1">
          <label htmlFor="title" className="text-sm font-medium">
            What needs attention?
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={200}
            placeholder="e.g. Leaking kitchen faucet"
            className={inputClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="category" className="text-sm font-medium">
              Category
            </label>
            <select
              id="category"
              name="category"
              defaultValue="other"
              className={`${inputClass} h-10`}
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="priority" className="text-sm font-medium">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              defaultValue="normal"
              className={`${inputClass} h-10`}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {priorityLabel(p)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            maxLength={10000}
            placeholder="Where is it, and what's happening?"
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="images" className="text-sm font-medium">
            Photos{" "}
            <span className="text-muted-foreground font-normal">
              (optional, up to {MAX_IMAGES_PER_REQUEST})
            </span>
          </label>
          <input
            id="images"
            type="file"
            name="images"
            accept="image/*"
            multiple
            className="text-muted-foreground block text-sm file:mr-2 file:rounded-md file:border file:px-2 file:py-1 file:text-xs"
          />
        </div>

        <SubmitButton pendingText="Filing…">File request</SubmitButton>
      </form>
    </div>
  );
}
