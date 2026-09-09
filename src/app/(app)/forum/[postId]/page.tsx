import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pin } from "lucide-react";

import { Avatar } from "@/components/avatar";
import { CategoryBadge } from "@/components/forum/category-badge";
import { CommentForm, CommentThread } from "@/components/forum/comment-thread";
import { ConfirmSubmitButton } from "@/components/forum/confirm-submit-button";
import { ReactionBar } from "@/components/forum/reaction-bar";
import { ThreadRealtime } from "@/components/forum/thread-realtime";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/context";
import { isManagerRole } from "@/lib/auth/types";
import { canDelete, canEditOwn } from "@/lib/forum/helpers";
import { formatWhen } from "@/lib/forum/format";
import { getPostDetail } from "@/lib/forum/queries";

import { deletePost, togglePin } from "../actions";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const viewer = await getViewer();
  const membership = viewer.activeMembership!;
  const isModerator = isManagerRole(membership.role);

  const post = await getPostDetail(
    membership.building_id,
    postId,
    viewer.userId
  );
  if (!post) notFound();

  const canEdit = canEditOwn(viewer.userId, post!.authorId);
  const canRemove = canDelete(viewer.userId, post!.authorId, isModerator);

  return (
    <div className="space-y-6">
      <ThreadRealtime postId={post!.id} />

      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/forum">
          <ArrowLeft data-icon="inline-start" />
          Back to forum
        </Link>
      </Button>

      <article className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {post!.isPinned ? (
              <Pin
                className="text-muted-foreground mr-1.5 mb-1 inline size-4"
                aria-label="Pinned"
              />
            ) : null}
            {post!.title}
          </h1>
          {post!.categories.length ? (
            <div className="flex flex-wrap gap-1.5">
              {post!.categories.map((c) => (
                <CategoryBadge key={c.id} category={c} />
              ))}
            </div>
          ) : null}
        </div>

        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Avatar
            url={post!.author.avatarUrl}
            name={post!.author.name}
            size={24}
          />
          <span className="text-foreground font-medium">
            {post!.author.name}
          </span>
          <span className="text-xs">
            {formatWhen(post!.createdAt)}
            {post!.editedAt ? " · edited" : ""}
          </span>
        </div>

        {post!.body ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {post!.body}
          </p>
        ) : null}

        {post!.attachments.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {post!.attachments.map((a) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={a.id}
                src={a.url}
                alt=""
                className="aspect-square w-full rounded-lg border object-cover"
              />
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <ReactionBar
            targetType="post"
            targetId={post!.id}
            reactions={post!.reactions}
          />
          <div className="flex items-center gap-2">
            {canEdit ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/forum/${post!.id}/edit`}>Edit</Link>
              </Button>
            ) : null}
            {isModerator ? (
              <form action={togglePin}>
                <input type="hidden" name="postId" value={post!.id} />
                <SubmitButton variant="outline" size="sm">
                  {post!.isPinned ? "Unpin" : "Pin"}
                </SubmitButton>
              </form>
            ) : null}
            {canRemove ? (
              <ConfirmSubmitButton
                action={deletePost}
                fields={{ postId: post!.id }}
                confirm="Delete this post? This cannot be undone."
                variant="destructive"
                size="sm"
                pendingText="Deleting…"
              >
                Delete
              </ConfirmSubmitButton>
            ) : null}
          </div>
        </div>
      </article>

      <section className="space-y-4 border-t pt-6">
        <h2 className="text-sm font-semibold">
          {post!.commentCount === 1
            ? "1 comment"
            : `${post!.commentCount} comments`}
        </h2>
        <CommentForm postId={post!.id} />
        <CommentThread
          comments={post!.comments}
          postId={post!.id}
          viewerId={viewer.userId}
          isModerator={isModerator}
        />
      </section>
    </div>
  );
}
