// Pure forum logic — no I/O, so it is unit-testable (see __tests__/forum.test.ts).

import type {
  CommentNode,
  CommentRow,
  ReactionRow,
  ReactionSummary,
} from "@/lib/forum/types";

/** The reaction palette offered in the UI, in display order. */
export const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "😮"] as const;

const REACTION_ORDER = new Map<string, number>(
  REACTION_EMOJIS.map((emoji, i) => [emoji, i])
);

/**
 * Tallies raw reaction rows into per-emoji summaries, flagging which ones the
 * viewer reacted with. Ordered by the palette, then any others alphabetically.
 */
export function summarizeReactions(
  rows: ReactionRow[],
  viewerId: string | null
): ReactionSummary[] {
  const byEmoji = new Map<string, { count: number; reacted: boolean }>();
  for (const { emoji, user_id } of rows) {
    const entry = byEmoji.get(emoji) ?? { count: 0, reacted: false };
    entry.count += 1;
    if (viewerId && user_id === viewerId) entry.reacted = true;
    byEmoji.set(emoji, entry);
  }

  return [...byEmoji.entries()]
    .map(([emoji, { count, reacted }]) => ({ emoji, count, reacted }))
    .sort((a, b) => {
      const ai = REACTION_ORDER.get(a.emoji) ?? Infinity;
      const bi = REACTION_ORDER.get(b.emoji) ?? Infinity;
      if (ai !== bi) return ai - bi;
      return a.emoji.localeCompare(b.emoji);
    });
}

/** Author or moderator may edit? Only the author edits their own content. */
export function canEditOwn(viewerId: string | null, authorId: string): boolean {
  return viewerId != null && viewerId === authorId;
}

/** The author OR a moderator (manager/admin) may delete. */
export function canDelete(
  viewerId: string | null,
  authorId: string,
  isModerator: boolean
): boolean {
  return isModerator || canEditOwn(viewerId, authorId);
}

/** Collapses runs of whitespace and truncates to a single-line feed excerpt. */
export function excerpt(body: string, maxLength = 180): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= maxLength) return flat;
  return flat.slice(0, maxLength - 1).trimEnd() + "…";
}

/**
 * Builds a two-level comment tree from flat rows. Any comment whose parent is
 * itself a reply (or whose parent is missing) is attached at the top level, so
 * threading never exceeds one level regardless of the stored `parent_comment_id`.
 * Preserves input order (which callers sort by `created_at`).
 */
export function buildCommentTree(
  rows: CommentRow[],
  decorate: (row: CommentRow) => Omit<CommentNode, "replies">
): CommentNode[] {
  const topLevelIds = new Set(
    rows.filter((r) => r.parent_comment_id == null).map((r) => r.id)
  );
  // Pass 1: create every node so attachment doesn't depend on row order.
  const nodes = new Map<string, CommentNode>(
    rows.map((row) => [row.id, { ...decorate(row), replies: [] }])
  );
  // Pass 2: attach each node to its top-level parent, or promote to a root.
  const roots: CommentNode[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id)!;
    const parentId = row.parent_comment_id;
    if (parentId && topLevelIds.has(parentId)) {
      nodes.get(parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
