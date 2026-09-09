import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/context";
import { canEditOwn } from "@/lib/forum/helpers";
import { createAdminClient } from "@/lib/supabase/admin";

import { updatePost } from "../../actions";

const inputClass =
  "border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { postId } = await params;
  const { error } = await searchParams;
  const viewer = await getViewer();
  const buildingId = viewer.activeMembership!.building_id;

  const admin = createAdminClient();
  const { data: post } = await admin
    .from("posts")
    .select("id, author_id, title, body")
    .eq("id", postId)
    .eq("building_id", buildingId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!post) notFound();
  if (!canEditOwn(viewer.userId, post!.author_id as string)) {
    redirect(`/forum/${postId}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Edit post</h1>
        <Button asChild variant="outline" size="sm">
          <Link href={`/forum/${postId}`}>Cancel</Link>
        </Button>
      </header>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <form action={updatePost} className="space-y-5">
        <input type="hidden" name="postId" value={postId} />
        <div className="space-y-1">
          <label htmlFor="title" className="text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={200}
            defaultValue={post!.title as string}
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
            defaultValue={post!.body as string}
            className={inputClass}
          />
        </div>
        <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
      </form>
    </div>
  );
}
