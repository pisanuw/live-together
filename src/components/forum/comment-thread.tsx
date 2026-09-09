"use client";

import { useRef, useState, useTransition } from "react";
import { cn } from "cn";

import {
  createComment,
  deleteComment,
  updateComment,
} from "@/app/(app)/forum/actions";
import { Avatar } from "@/components/avatar";
import { ReactionBar } from "@/components/forum/reaction-bar";
import { Button } from "@/components/ui/button";
import { formatWhen } from "@/lib/forum/format";
import type { CommentNode } from "@/lib/forum/types";

const textareaClass =
  "border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2";

/** Compose a new comment or reply. Clears and calls `onDone` on success. */
export function CommentForm({
  postId,
  parentCommentId,
  placeholder = "Add a comment…",
  submitLabel = "Comment",
  autoFocus = false,
  onDone,
}: {
  postId: string;
  parentCommentId?: string;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = ref.current?.value.trim();
    if (!body) return;
    const fd = new FormData();
    fd.set("postId", postId);
    if (parentCommentId) fd.set("parentCommentId", parentCommentId);
    fd.set("body", body);
    startTransition(async () => {
      await createComment(fd);
      if (ref.current) ref.current.value = "";
      onDone?.();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea
        ref={ref}
        rows={parentCommentId ? 2 : 3}
        maxLength={5000}
        required
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={textareaClass}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
          {pending ? "Sending…" : submitLabel}
        </Button>
        {onDone ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onDone}
            disabled={pending}
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function CommentItem({
  node,
  postId,
  viewerId,
  isModerator,
  isReply,
}: {
  node: CommentNode;
  postId: string;
  viewerId: string | null;
  isModerator: boolean;
  isReply: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);
  const [pending, startTransition] = useTransition();
  const editRef = useRef<HTMLTextAreaElement>(null);

  const isOwn = viewerId != null && viewerId === node.author.id;
  const canRemove = isModerator || isOwn;

  function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    const body = editRef.current?.value.trim();
    if (!body) return;
    const fd = new FormData();
    fd.set("commentId", node.id);
    fd.set("body", body);
    startTransition(async () => {
      await updateComment(fd);
      setEditing(false);
    });
  }

  function remove() {
    if (!window.confirm("Delete this comment?")) return;
    const fd = new FormData();
    fd.set("commentId", node.id);
    startTransition(() => deleteComment(fd));
  }

  return (
    <div className={cn(isReply && "border-border/60 border-l pl-4")}>
      <div className="flex items-center gap-2">
        <Avatar url={node.author.avatarUrl} name={node.author.name} size={22} />
        <span className="text-sm font-medium">{node.author.name}</span>
        <span className="text-muted-foreground text-xs">
          {formatWhen(node.createdAt)}
          {node.editedAt ? " · edited" : ""}
        </span>
      </div>

      {editing ? (
        <form onSubmit={saveEdit} className="mt-2 space-y-2">
          <textarea
            ref={editRef}
            rows={3}
            maxLength={5000}
            required
            defaultValue={node.body}
            className={textareaClass}
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-1 text-sm whitespace-pre-wrap">{node.body}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <ReactionBar
          targetType="comment"
          targetId={node.id}
          reactions={node.reactions}
        />
        <div className="flex items-center gap-1">
          {!isReply ? (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => setReplying((v) => !v)}
            >
              Reply
            </Button>
          ) : null}
          {isOwn ? (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => setEditing((v) => !v)}
            >
              Edit
            </Button>
          ) : null}
          {canRemove ? (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={remove}
              disabled={pending}
            >
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      {replying ? (
        <div className="mt-3">
          <CommentForm
            postId={postId}
            parentCommentId={node.id}
            placeholder={`Reply to ${node.author.name}…`}
            submitLabel="Reply"
            autoFocus
            onDone={() => setReplying(false)}
          />
        </div>
      ) : null}

      {node.replies.length ? (
        <div className="mt-4 space-y-4">
          {node.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              node={reply}
              postId={postId}
              viewerId={viewerId}
              isModerator={isModerator}
              isReply
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** The full comment tree for a post, with inline reply/edit/delete/react. */
export function CommentThread({
  comments,
  postId,
  viewerId,
  isModerator,
}: {
  comments: CommentNode[];
  postId: string;
  viewerId: string | null;
  isModerator: boolean;
}) {
  if (comments.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No comments yet. Start the conversation.
      </p>
    );
  }
  return (
    <div className="space-y-6">
      {comments.map((node) => (
        <CommentItem
          key={node.id}
          node={node}
          postId={postId}
          viewerId={viewerId}
          isModerator={isModerator}
          isReply={false}
        />
      ))}
    </div>
  );
}
