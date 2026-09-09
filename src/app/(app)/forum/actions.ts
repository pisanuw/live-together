"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getViewer } from "@/lib/auth/context";
import { viewerStatus } from "@/lib/auth/routing";
import { isManagerRole } from "@/lib/auth/types";
import { canDelete, canEditOwn, REACTION_EMOJIS } from "@/lib/forum/helpers";
import {
  isAcceptedImage,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_POST,
  uploadForumImage,
} from "@/lib/forum/media";
import { createAdminClient } from "@/lib/supabase/admin";

/** The authenticated, approved actor plus their building + moderation rights. */
async function requireActor() {
  const viewer = await getViewer();
  if (viewerStatus(viewer) !== "approved" || !viewer.userId) redirect("/");
  const membership = viewer.activeMembership!;
  return {
    admin: createAdminClient(),
    viewerId: viewer.userId,
    buildingId: membership.building_id,
    isModerator: isManagerRole(membership.role),
  };
}

const REACTION_SET = new Set<string>(REACTION_EMOJIS);

const postSchema = z.object({
  title: z.string().trim().min(1, "Add a title").max(200),
  body: z.string().max(10_000),
});

const commentSchema = z.object({
  body: z.string().trim().min(1, "Write a comment").max(5_000),
});

function nowIso(): string {
  return new Date().toISOString();
}

// ------------------------------------------------------------------ posts ----

export async function createPost(formData: FormData) {
  const { admin, viewerId, buildingId } = await requireActor();

  const parsed = postSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") ?? "",
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid post";
    redirect(`/forum/new?error=${encodeURIComponent(msg)}`);
  }
  const { title, body } = parsed.data;

  // Validate images up front so we never create a post we can't complete.
  const images = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (images.length > MAX_IMAGES_PER_POST) {
    redirect(
      `/forum/new?error=${encodeURIComponent(
        `Up to ${MAX_IMAGES_PER_POST} images per post`
      )}`
    );
  }
  for (const file of images) {
    if (!isAcceptedImage(file.type)) {
      redirect(
        `/forum/new?error=${encodeURIComponent("Only image files (png, jpg, webp, gif)")}`
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      redirect(
        `/forum/new?error=${encodeURIComponent("Each image must be under 8MB")}`
      );
    }
  }

  // Resolve the submitted category slugs to ids in THIS building only.
  const slugs = formData.getAll("categories").map(String);
  const { data: categoryRows } = slugs.length
    ? await admin
        .from("categories")
        .select("id, slug")
        .eq("building_id", buildingId)
        .in("slug", slugs)
    : { data: [] };
  const categoryIds = (categoryRows ?? []).map((c) => c.id as string);

  const { data: post, error } = await admin
    .from("posts")
    .insert({ building_id: buildingId, author_id: viewerId, title, body })
    .select("id")
    .single();
  if (error || !post) {
    redirect(
      `/forum/new?error=${encodeURIComponent("Could not create the post")}`
    );
  }
  const postId = post!.id as string;

  if (categoryIds.length) {
    await admin.from("post_categories").insert(
      categoryIds.map((category_id) => ({
        post_id: postId,
        category_id,
        building_id: buildingId,
      }))
    );
  }

  for (const file of images) {
    try {
      const path = await uploadForumImage(buildingId, postId, file);
      await admin.from("attachments").insert({
        building_id: buildingId,
        owner_id: viewerId,
        storage_path: path,
        mime_type: file.type,
        kind: "image",
        byte_size: file.size,
        post_id: postId,
      });
    } catch {
      // Skip an image that fails to upload rather than lose the whole post.
    }
  }

  revalidatePath("/forum");
  redirect(`/forum/${postId}`);
}

export async function updatePost(formData: FormData) {
  const { admin, viewerId, buildingId } = await requireActor();
  const postId = String(formData.get("postId") ?? "");

  const { data: existing } = await admin
    .from("posts")
    .select("id, author_id")
    .eq("id", postId)
    .eq("building_id", buildingId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!existing) redirect("/forum");
  if (!canEditOwn(viewerId, existing!.author_id as string)) {
    redirect(`/forum/${postId}`);
  }

  const parsed = postSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") ?? "",
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid post";
    redirect(`/forum/${postId}/edit?error=${encodeURIComponent(msg)}`);
  }

  await admin
    .from("posts")
    .update({ ...parsed.data, edited_at: nowIso() })
    .eq("id", postId);
  revalidatePath("/forum");
  revalidatePath(`/forum/${postId}`);
  redirect(`/forum/${postId}`);
}

export async function deletePost(formData: FormData) {
  const { admin, viewerId, buildingId, isModerator } = await requireActor();
  const postId = String(formData.get("postId") ?? "");

  const { data: existing } = await admin
    .from("posts")
    .select("id, author_id")
    .eq("id", postId)
    .eq("building_id", buildingId)
    .maybeSingle();
  if (!existing) redirect("/forum");
  if (!canDelete(viewerId, existing!.author_id as string, isModerator)) {
    redirect(`/forum/${postId}`);
  }

  await admin.from("posts").update({ deleted_at: nowIso() }).eq("id", postId);
  revalidatePath("/forum");
  redirect("/forum");
}

export async function togglePin(formData: FormData) {
  const { admin, buildingId, isModerator } = await requireActor();
  if (!isModerator) redirect("/forum");
  const postId = String(formData.get("postId") ?? "");

  const { data: existing } = await admin
    .from("posts")
    .select("id, is_pinned")
    .eq("id", postId)
    .eq("building_id", buildingId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!existing) redirect("/forum");

  await admin
    .from("posts")
    .update({ is_pinned: !existing!.is_pinned })
    .eq("id", postId);
  revalidatePath("/forum");
  revalidatePath(`/forum/${postId}`);
}

// --------------------------------------------------------------- comments ----

export async function createComment(formData: FormData) {
  const { admin, viewerId, buildingId } = await requireActor();
  const postId = String(formData.get("postId") ?? "");
  const rawParent = String(formData.get("parentCommentId") ?? "").trim();

  const { data: post } = await admin
    .from("posts")
    .select("id")
    .eq("id", postId)
    .eq("building_id", buildingId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!post) redirect("/forum");

  const parsed = commentSchema.safeParse({ body: formData.get("body") ?? "" });
  if (!parsed.success) redirect(`/forum/${postId}`);

  // Keep threading one level deep: a reply to a reply attaches to its root.
  let parentCommentId: string | null = null;
  if (rawParent) {
    const { data: parent } = await admin
      .from("comments")
      .select("id, parent_comment_id, post_id")
      .eq("id", rawParent)
      .eq("building_id", buildingId)
      .is("deleted_at", null)
      .maybeSingle();
    if (parent && parent.post_id === postId) {
      parentCommentId =
        (parent.parent_comment_id as string | null) ?? (parent.id as string);
    }
  }

  await admin.from("comments").insert({
    building_id: buildingId,
    post_id: postId,
    author_id: viewerId,
    parent_comment_id: parentCommentId,
    body: parsed.data.body,
  });
  revalidatePath("/forum");
  revalidatePath(`/forum/${postId}`);
}

export async function updateComment(formData: FormData) {
  const { admin, viewerId, buildingId } = await requireActor();
  const commentId = String(formData.get("commentId") ?? "");

  const { data: existing } = await admin
    .from("comments")
    .select("id, author_id, post_id")
    .eq("id", commentId)
    .eq("building_id", buildingId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!existing) redirect("/forum");
  if (!canEditOwn(viewerId, existing!.author_id as string)) {
    redirect(`/forum/${existing!.post_id}`);
  }

  const parsed = commentSchema.safeParse({ body: formData.get("body") ?? "" });
  if (!parsed.success) redirect(`/forum/${existing!.post_id}`);

  await admin
    .from("comments")
    .update({ body: parsed.data.body, edited_at: nowIso() })
    .eq("id", commentId);
  revalidatePath(`/forum/${existing!.post_id}`);
}

export async function deleteComment(formData: FormData) {
  const { admin, viewerId, buildingId, isModerator } = await requireActor();
  const commentId = String(formData.get("commentId") ?? "");

  const { data: existing } = await admin
    .from("comments")
    .select("id, author_id, post_id")
    .eq("id", commentId)
    .eq("building_id", buildingId)
    .maybeSingle();
  if (!existing) redirect("/forum");
  if (!canDelete(viewerId, existing!.author_id as string, isModerator)) {
    redirect(`/forum/${existing!.post_id}`);
  }

  await admin
    .from("comments")
    .update({ deleted_at: nowIso() })
    .eq("id", commentId);
  revalidatePath("/forum");
  revalidatePath(`/forum/${existing!.post_id}`);
}

// -------------------------------------------------------------- reactions ----

export async function toggleReaction(formData: FormData) {
  const { admin, viewerId, buildingId } = await requireActor();
  const targetType = String(formData.get("targetType") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  const emoji = String(formData.get("emoji") ?? "");

  if (targetType !== "post" && targetType !== "comment") return;
  if (!REACTION_SET.has(emoji)) return;

  // Confirm the target exists in this building, and find the post to revalidate.
  let postId: string | null = null;
  if (targetType === "post") {
    const { data } = await admin
      .from("posts")
      .select("id")
      .eq("id", targetId)
      .eq("building_id", buildingId)
      .is("deleted_at", null)
      .maybeSingle();
    postId = data?.id ?? null;
  } else {
    const { data } = await admin
      .from("comments")
      .select("post_id")
      .eq("id", targetId)
      .eq("building_id", buildingId)
      .is("deleted_at", null)
      .maybeSingle();
    postId = (data?.post_id as string | undefined) ?? null;
  }
  if (!postId) return;

  const { data: existing } = await admin
    .from("reactions")
    .select("id")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("user_id", viewerId)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await admin.from("reactions").delete().eq("id", existing.id);
  } else {
    await admin.from("reactions").insert({
      building_id: buildingId,
      target_type: targetType,
      target_id: targetId,
      user_id: viewerId,
      emoji,
    });
  }

  revalidatePath("/forum");
  revalidatePath(`/forum/${postId}`);
}
