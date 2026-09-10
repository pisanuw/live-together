import Link from "next/link";
import { ImageIcon, MessageCircle } from "lucide-react";

import {
  CategoryBadge,
  PriorityBadge,
  StatusBadge,
} from "@/components/maintenance/badges";
import { formatWhen } from "@/lib/forum/format";
import type { RequestListItem } from "@/lib/maintenance/types";

/** A row in the maintenance list. `showCreator` is for the manager view. */
export function RequestCard({
  request,
  showCreator,
}: {
  request: RequestListItem;
  showCreator: boolean;
}) {
  return (
    <Link
      href={`/maintenance/${request.id}`}
      className="hover:bg-muted/40 focus-visible:ring-ring block rounded-lg border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">{request.title}</h3>
        <StatusBadge status={request.status} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <CategoryBadge category={request.category} />
        <PriorityBadge priority={request.priority} />
      </div>

      <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span>{formatWhen(request.createdAt)}</span>
        {showCreator ? <span>by {request.creator.name}</span> : null}
        {request.assignee ? <span>· {request.assignee.name}</span> : null}
        {request.commentCount > 0 ? (
          <span className="flex items-center gap-1">
            <MessageCircle className="size-3.5" /> {request.commentCount}
          </span>
        ) : null}
        {request.imageCount > 0 ? (
          <span className="flex items-center gap-1">
            <ImageIcon className="size-3.5" /> {request.imageCount}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
