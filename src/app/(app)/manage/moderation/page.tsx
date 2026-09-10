import Link from "next/link";
import { redirect } from "next/navigation";
import { Pin } from "lucide-react";

import { ConfirmSubmitButton } from "@/components/forum/confirm-submit-button";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/context";
import { isManagerRole } from "@/lib/auth/types";
import { formatWhen } from "@/lib/forum/format";
import { listPosts } from "@/lib/forum/queries";

import { deletePost, togglePin } from "../../forum/actions";

export default async function ModerationPage() {
  const viewer = await getViewer();
  const active = viewer.activeMembership!;
  if (!isManagerRole(active.role)) redirect("/");

  const posts = await listPosts(active.building_id);

  return (
    <div className="max-w-2xl space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Moderation</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/manage">Back</Link>
        </Button>
      </header>

      <p className="text-muted-foreground text-sm">
        Pin important posts or remove ones that break the rules. Removed posts
        disappear from the forum for everyone.
      </p>

      {posts.length === 0 ? (
        <div className="bg-muted/40 text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
          No forum posts yet.
        </div>
      ) : (
        <ul className="divide-border divide-y rounded-lg border">
          {posts.map((post) => (
            <li
              key={post.id}
              className="flex items-center justify-between gap-3 p-3"
            >
              <div className="min-w-0">
                <Link
                  href={`/forum/${post.id}`}
                  className="flex items-center gap-1.5 font-medium hover:underline"
                >
                  {post.isPinned ? (
                    <Pin className="text-muted-foreground size-3.5" />
                  ) : null}
                  <span className="truncate">{post.title}</span>
                </Link>
                <p className="text-muted-foreground text-xs">
                  {post.author.name} · {formatWhen(post.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <form action={togglePin}>
                  <input type="hidden" name="postId" value={post.id} />
                  <SubmitButton size="xs" variant="outline" pendingText="…">
                    {post.isPinned ? "Unpin" : "Pin"}
                  </SubmitButton>
                </form>
                <ConfirmSubmitButton
                  action={deletePost}
                  fields={{ postId: post.id }}
                  confirm="Remove this post?"
                  size="xs"
                  variant="ghost"
                  pendingText="…"
                >
                  Remove
                </ConfirmSubmitButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
