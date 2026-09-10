import Link from "next/link";

import { SubmitButton } from "@/components/submit-button";
import { getViewer } from "@/lib/auth/context";
import { formatWhen } from "@/lib/forum/format";
import { listNotifications } from "@/lib/notifications/queries";

import { markAllRead, markRead } from "./actions";

export default async function NotificationsPage() {
  const viewer = await getViewer();
  const notifications = await listNotifications(viewer.userId!);
  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        {hasUnread ? (
          <form action={markAllRead}>
            <SubmitButton variant="outline" size="sm" pendingText="Marking…">
              Mark all read
            </SubmitButton>
          </form>
        ) : null}
      </header>

      {notifications.length === 0 ? (
        <div className="bg-muted/40 text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
          You&apos;re all caught up.
        </div>
      ) : (
        <ul className="divide-border divide-y rounded-lg border">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-3 p-3 ${n.readAt ? "" : "bg-muted/30"}`}
            >
              <span
                aria-hidden
                className={`mt-1.5 size-2 shrink-0 rounded-full ${
                  n.readAt ? "bg-transparent" : "bg-primary"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{n.title}</p>
                {n.body ? (
                  <p className="text-muted-foreground text-sm">{n.body}</p>
                ) : null}
                <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                  <span>{formatWhen(n.createdAt)}</span>
                  {n.link ? (
                    <Link href={n.link} className="hover:underline">
                      View
                    </Link>
                  ) : null}
                </div>
              </div>
              {!n.readAt ? (
                <form action={markRead}>
                  <input type="hidden" name="id" value={n.id} />
                  <SubmitButton variant="ghost" size="xs" pendingText="…">
                    Mark read
                  </SubmitButton>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
