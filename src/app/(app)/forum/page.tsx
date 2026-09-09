import Link from "next/link";
import { ImageIcon, MessageCircle, Pin, Plus, Smile } from "lucide-react";

import { Avatar } from "@/components/avatar";
import { CategoryBadge } from "@/components/forum/category-badge";
import { CategoryFilter } from "@/components/forum/category-filter";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/context";
import { formatWhen } from "@/lib/forum/format";
import { listCategories, listPosts } from "@/lib/forum/queries";

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const viewer = await getViewer();
  const buildingId = viewer.activeMembership!.building_id;

  const [categories, posts] = await Promise.all([
    listCategories(buildingId),
    listPosts(buildingId, { categorySlug: category }),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forum</h1>
          <p className="text-muted-foreground text-sm">
            Talk with your neighbors — post, reply, react, and tag by category.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/forum/new">
            <Plus data-icon="inline-start" />
            New post
          </Link>
        </Button>
      </header>

      <CategoryFilter categories={categories} activeSlug={category} />

      {posts.length === 0 ? (
        <div className="bg-muted/40 text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
          {category
            ? "No posts in this category yet."
            : "No posts yet. Be the first to start a conversation."}
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={`/forum/${post.id}`}
                className="hover:bg-muted/40 focus-visible:ring-ring block rounded-lg border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold">
                    {post.isPinned ? (
                      <Pin
                        className="text-muted-foreground mr-1 mb-0.5 inline size-3.5"
                        aria-label="Pinned"
                      />
                    ) : null}
                    {post.title}
                  </h2>
                </div>

                {post.excerpt ? (
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                    {post.excerpt}
                  </p>
                ) : null}

                {post.categories.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {post.categories.map((c) => (
                      <CategoryBadge key={c.id} category={c} />
                    ))}
                  </div>
                ) : null}

                <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="flex items-center gap-1.5">
                    <Avatar
                      url={post.author.avatarUrl}
                      name={post.author.name}
                      size={18}
                    />
                    {post.author.name}
                  </span>
                  <span>{formatWhen(post.createdAt)}</span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="size-3.5" /> {post.commentCount}
                  </span>
                  {post.reactionCount > 0 ? (
                    <span className="flex items-center gap-1">
                      <Smile className="size-3.5" /> {post.reactionCount}
                    </span>
                  ) : null}
                  {post.imageCount > 0 ? (
                    <span className="flex items-center gap-1">
                      <ImageIcon className="size-3.5" /> {post.imageCount}
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
