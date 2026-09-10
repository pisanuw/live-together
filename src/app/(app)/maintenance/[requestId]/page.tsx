import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";

import { Avatar } from "@/components/avatar";
import { ConfirmSubmitButton } from "@/components/forum/confirm-submit-button";
import {
  CategoryBadge,
  PriorityBadge,
  StatusBadge,
} from "@/components/maintenance/badges";
import { CommentForm } from "@/components/maintenance/comment-form";
import { TriagePanel } from "@/components/maintenance/triage-panel";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/context";
import { isManagerRole } from "@/lib/auth/types";
import { formatWhen } from "@/lib/forum/format";
import { isOpenStatus, statusLabel } from "@/lib/maintenance/helpers";
import { getRequestDetail, listManagers } from "@/lib/maintenance/queries";

import { cancelRequest } from "../actions";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const viewer = await getViewer();
  const membership = viewer.activeMembership!;
  const isManager = isManagerRole(membership.role);

  const request = await getRequestDetail(
    membership.building_id,
    requestId,
    viewer.userId!,
    isManager
  );
  if (!request) notFound();

  const isOwner = request!.creatorId === viewer.userId;
  const canCancel = (isOwner || isManager) && isOpenStatus(request!.status);
  const managers = isManager ? await listManagers(membership.building_id) : [];

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/maintenance">
          <ArrowLeft data-icon="inline-start" />
          Back to maintenance
        </Link>
      </Button>

      <article className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {request!.title}
          </h1>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={request!.status} />
            <PriorityBadge priority={request!.priority} />
            <CategoryBadge category={request!.category} />
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="flex items-center gap-1.5">
              <Avatar
                url={request!.creator.avatarUrl}
                name={request!.creator.name}
                size={18}
              />
              {request!.creator.name}
            </span>
            <span>{formatWhen(request!.createdAt)}</span>
            {request!.assignee ? (
              <span>Assigned to {request!.assignee.name}</span>
            ) : null}
          </div>
        </div>

        {request!.description ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {request!.description}
          </p>
        ) : null}

        {request!.attachments.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {request!.attachments.map((a) => (
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

        {canCancel ? (
          <div className="border-t pt-4">
            <ConfirmSubmitButton
              action={cancelRequest}
              fields={{ requestId: request!.id }}
              confirm="Cancel this request?"
              variant="outline"
              size="sm"
              pendingText="Cancelling…"
            >
              Cancel request
            </ConfirmSubmitButton>
          </div>
        ) : null}
      </article>

      {isManager ? (
        <TriagePanel request={request!} managers={managers} />
      ) : null}

      <section className="space-y-4 border-t pt-6">
        <h2 className="text-sm font-semibold">Activity</h2>

        {request!.updates.length === 0 ? (
          <p className="text-muted-foreground text-sm">No activity yet.</p>
        ) : (
          <ul className="space-y-4">
            {request!.updates.map((u) => (
              <li key={u.id} className="flex gap-3">
                <Avatar
                  url={u.author.avatarUrl}
                  name={u.author.name}
                  size={24}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                    <span className="font-medium">{u.author.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatWhen(u.createdAt)}
                    </span>
                    {u.isInternal ? (
                      <span className="text-muted-foreground flex items-center gap-1 rounded-full border px-1.5 text-xs">
                        <Lock className="size-3" /> Internal
                      </span>
                    ) : null}
                  </div>
                  {u.statusTo ? (
                    <p className="text-muted-foreground mt-0.5 text-sm">
                      Changed status
                      {u.statusFrom
                        ? ` from ${statusLabel(u.statusFrom)}`
                        : ""}{" "}
                      to{" "}
                      <span className="text-foreground font-medium">
                        {statusLabel(u.statusTo)}
                      </span>
                    </p>
                  ) : null}
                  {u.body ? (
                    <p className="mt-0.5 text-sm whitespace-pre-wrap">
                      {u.body}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t pt-4">
          <CommentForm requestId={request!.id} canBeInternal={isManager} />
        </div>
      </section>
    </div>
  );
}
