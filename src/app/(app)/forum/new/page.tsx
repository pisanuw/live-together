import Link from "next/link";

import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/context";
import { MAX_IMAGES_PER_POST } from "@/lib/forum/media";
import { listCategories } from "@/lib/forum/queries";

import { createPost } from "../actions";

const inputClass =
  "border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const viewer = await getViewer();
  const categories = await listCategories(viewer.activeMembership!.building_id);

  return (
    <div className="max-w-2xl space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">New post</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/forum">Cancel</Link>
        </Button>
      </header>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <form action={createPost} className="space-y-5">
        <div className="space-y-1">
          <label htmlFor="title" className="text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={200}
            placeholder="What's on your mind?"
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="body" className="text-sm font-medium">
            Message
          </label>
          <textarea
            id="body"
            name="body"
            rows={6}
            maxLength={10000}
            placeholder="Share the details…"
            className={inputClass}
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Categories</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="categories"
                  value={c.slug}
                  className="accent-foreground size-4"
                />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-1">
          <label htmlFor="images" className="text-sm font-medium">
            Images{" "}
            <span className="text-muted-foreground font-normal">
              (optional, up to {MAX_IMAGES_PER_POST})
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

        <SubmitButton pendingText="Posting…">Post</SubmitButton>
      </form>
    </div>
  );
}
