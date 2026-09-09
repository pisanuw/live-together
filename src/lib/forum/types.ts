// Domain types for the forum (Stage 3). Row types mirror the `wcv` tables;
// "view" types are the composed shapes the UI actually renders.

export type ReactionTargetType = "post" | "comment";

export interface Category {
  id: string;
  building_id: string;
  slug: string;
  label: string;
  color: string | null;
  sort_order: number;
}

export interface PostRow {
  id: string;
  building_id: string;
  author_id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

export interface CommentRow {
  id: string;
  building_id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: string | null;
  body: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

export interface ReactionRow {
  emoji: string;
  user_id: string;
}

/** A post/comment author, resolved to what the UI shows. */
export interface Author {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/** One emoji's tally on a target, plus whether the viewer is among them. */
export interface ReactionSummary {
  emoji: string;
  count: number;
  reacted: boolean;
}

/** A resolved image attachment (signed URL). */
export interface AttachmentView {
  id: string;
  url: string;
}

/** A row in the forum feed. */
export interface PostListItem {
  id: string;
  title: string;
  excerpt: string;
  isPinned: boolean;
  createdAt: string;
  author: Author;
  categories: Category[];
  commentCount: number;
  reactionCount: number;
  imageCount: number;
}

/** A comment plus its (one level of) replies. */
export interface CommentNode {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  author: Author;
  reactions: ReactionSummary[];
  replies: CommentNode[];
}

/** Everything the post detail page renders. */
export interface PostDetail {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: string;
  editedAt: string | null;
  authorId: string;
  author: Author;
  categories: Category[];
  attachments: AttachmentView[];
  reactions: ReactionSummary[];
  comments: CommentNode[];
  commentCount: number;
}
