"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

/**
 * Live-updates an open thread: subscribes to inserts/updates on this post and
 * its comments and refreshes the route so new replies and edits appear without
 * a manual reload. Degrades silently if Realtime isn't enabled on the project.
 */
export function ThreadRealtime({ postId }: { postId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`forum-post-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "wcv",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "wcv",
          table: "posts",
          filter: `id=eq.${postId}`,
        },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, router]);

  return null;
}
