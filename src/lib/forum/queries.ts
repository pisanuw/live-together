import "server-only";

import type { Profile } from "@/lib/auth/types";
import { displayName } from "@/lib/auth/types";
import {
  buildCommentTree,
  excerpt,
  summarizeReactions,
} from "@/lib/forum/helpers";
import { signForumUrls } from "@/lib/forum/media";
import type {
  Author,
  Category,
  CommentRow,
  PostDetail,
  PostListItem,
  PostRow,
} from "@/lib/forum/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAvatarUrl } from "@/lib/storage/avatars";

type Admin = ReturnType<typeof createAdminClient>;

/** Resolves distinct author profiles to display-ready Authors (signed avatars). */
async function resolveAuthors(
  admin: Admin,
  authorIds: string[]
): Promise<Map<string, Author>> {
  const ids = [...new Set(authorIds)];
  const map = new Map<string, Author>();
  if (ids.length === 0) return map;

  const { data } = await admin.from("profiles").select("*").in("id", ids);
  const profiles = new Map(
    ((data as Profile[] | null) ?? []).map((p) => [p.id, p])
  );

  await Promise.all(
    ids.map(async (id) => {
      const profile = profiles.get(id) ?? null;
      map.set(id, {
        id,
        name: displayName(profile, "Resident"),
        avatarUrl: await resolveAvatarUrl(profile?.avatar_url),
      });
    })
  );
  return map;
}

/** All categories for a building, in display order. */
export async function listCategories(buildingId: string): Promise<Category[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("categories")
    .select("*")
    .eq("building_id", buildingId)
    .order("sort_order", { ascending: true });
  return (data as Category[] | null) ?? [];
}

/** Counts occurrences of a key column across rows. */
function tally<T extends Record<string, unknown>>(
  rows: T[] | null,
  key: keyof T
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    const id = String(row[key]);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/**
 * The forum feed for a building: non-deleted posts (pinned first, newest next),
 * each with author, category tags, and comment/reaction/image counts. When
 * `categorySlug` is given, only posts tagged with that category are returned.
 */
export async function listPosts(
  buildingId: string,
  options: { categorySlug?: string } = {}
): Promise<PostListItem[]> {
  const admin = createAdminClient();
  const categories = await listCategories(buildingId);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  let postsQuery = admin
    .from("posts")
    .select("*")
    .eq("building_id", buildingId)
    .is("deleted_at", null)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (options.categorySlug) {
    const category = categories.find((c) => c.slug === options.categorySlug);
    if (!category) return [];
    const { data: tagged } = await admin
      .from("post_categories")
      .select("post_id")
      .eq("building_id", buildingId)
      .eq("category_id", category.id);
    const ids = (tagged ?? []).map((t) => t.post_id as string);
    if (ids.length === 0) return [];
    postsQuery = postsQuery.in("id", ids);
  }

  const { data: postsData } = await postsQuery;
  const posts = (postsData as PostRow[] | null) ?? [];
  if (posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);
  const [authors, tagRows, commentRows, reactionRows, imageRows] =
    await Promise.all([
      resolveAuthors(
        admin,
        posts.map((p) => p.author_id)
      ),
      admin
        .from("post_categories")
        .select("post_id, category_id")
        .in("post_id", postIds),
      admin
        .from("comments")
        .select("post_id")
        .in("post_id", postIds)
        .is("deleted_at", null),
      admin
        .from("reactions")
        .select("target_id")
        .eq("target_type", "post")
        .in("target_id", postIds),
      admin.from("attachments").select("post_id").in("post_id", postIds),
    ]);

  const tagsByPost = new Map<string, Category[]>();
  for (const row of tagRows.data ?? []) {
    const category = categoryById.get(row.category_id as string);
    if (!category) continue;
    const list = tagsByPost.get(row.post_id as string) ?? [];
    list.push(category);
    tagsByPost.set(row.post_id as string, list);
  }

  const commentCounts = tally(commentRows.data, "post_id");
  const reactionCounts = tally(reactionRows.data, "target_id");
  const imageCounts = tally(imageRows.data, "post_id");

  return posts.map((post) => ({
    id: post.id,
    title: post.title,
    excerpt: excerpt(post.body),
    isPinned: post.is_pinned,
    createdAt: post.created_at,
    author: authors.get(post.author_id) ?? {
      id: post.author_id,
      name: "Resident",
      avatarUrl: null,
    },
    categories: (tagsByPost.get(post.id) ?? []).sort(
      (a, b) => a.sort_order - b.sort_order
    ),
    commentCount: commentCounts.get(post.id) ?? 0,
    reactionCount: reactionCounts.get(post.id) ?? 0,
    imageCount: imageCounts.get(post.id) ?? 0,
  }));
}

/**
 * A single post with its author, category tags, image attachments, reactions,
 * and (one level of) threaded comments. Returns null if the post is missing,
 * deleted, or in another building.
 */
export async function getPostDetail(
  buildingId: string,
  postId: string,
  viewerId: string | null
): Promise<PostDetail | null> {
  const admin = createAdminClient();

  const { data: postData } = await admin
    .from("posts")
    .select("*")
    .eq("building_id", buildingId)
    .eq("id", postId)
    .is("deleted_at", null)
    .maybeSingle();
  const post = postData as PostRow | null;
  if (!post) return null;

  const [categories, { data: commentsData }, { data: attachmentData }] =
    await Promise.all([
      listCategories(buildingId),
      admin
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true }),
      admin
        .from("attachments")
        .select("id, storage_path")
        .eq("post_id", postId)
        .order("created_at", { ascending: true }),
    ]);

  const comments = (commentsData as CommentRow[] | null) ?? [];
  const commentIds = comments.map((c) => c.id);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const [{ data: tagRows }, { data: reactionRows }, signedUrls, authors] =
    await Promise.all([
      admin.from("post_categories").select("category_id").eq("post_id", postId),
      admin
        .from("reactions")
        .select("target_type, target_id, emoji, user_id")
        .eq("building_id", buildingId)
        .in("target_id", [postId, ...commentIds]),
      signForumUrls(
        ((attachmentData as { storage_path: string }[] | null) ?? []).map(
          (a) => a.storage_path
        )
      ),
      resolveAuthors(admin, [
        post.author_id,
        ...comments.map((c) => c.author_id),
      ]),
    ]);

  // Group reactions by target for O(1) lookup while decorating.
  const reactionsByTarget = new Map<
    string,
    { emoji: string; user_id: string }[]
  >();
  for (const r of reactionRows ?? []) {
    const key = `${r.target_type}:${r.target_id}`;
    const list = reactionsByTarget.get(key) ?? [];
    list.push({ emoji: r.emoji as string, user_id: r.user_id as string });
    reactionsByTarget.set(key, list);
  }
  const reactionsFor = (type: string, id: string) =>
    summarizeReactions(reactionsByTarget.get(`${type}:${id}`) ?? [], viewerId);

  const attachments = (
    (attachmentData as { id: string; storage_path: string }[] | null) ?? []
  )
    .map((a) => ({ id: a.id, url: signedUrls.get(a.storage_path) }))
    .filter((a): a is { id: string; url: string } => Boolean(a.url));

  const commentTree = buildCommentTree(comments, (row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    author: authors.get(row.author_id) ?? {
      id: row.author_id,
      name: "Resident",
      avatarUrl: null,
    },
    reactions: reactionsFor("comment", row.id),
  }));

  const tagCategories = (tagRows ?? [])
    .map((t) => categoryById.get(t.category_id as string))
    .filter((c): c is Category => Boolean(c))
    .sort((a, b) => a.sort_order - b.sort_order);

  return {
    id: post.id,
    title: post.title,
    body: post.body,
    isPinned: post.is_pinned,
    createdAt: post.created_at,
    editedAt: post.edited_at,
    authorId: post.author_id,
    author: authors.get(post.author_id) ?? {
      id: post.author_id,
      name: "Resident",
      avatarUrl: null,
    },
    categories: tagCategories,
    attachments,
    reactions: reactionsFor("post", post.id),
    comments: commentTree,
    commentCount: comments.length,
  };
}
