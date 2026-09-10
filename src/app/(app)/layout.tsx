import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { AppNav } from "@/components/app-nav";
import { NotificationsRealtime } from "@/components/notifications/realtime";
import { getViewer } from "@/lib/auth/context";
import { viewerStatus } from "@/lib/auth/routing";
import { displayName, isManagerRole } from "@/lib/auth/types";
import { unreadCount } from "@/lib/notifications/queries";
import { resolveAvatarUrl } from "@/lib/storage/avatars";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
  const status = viewerStatus(viewer);
  if (status === "unauthenticated") redirect("/login");
  if (status !== "approved") redirect("/pending");

  const active = viewer.activeMembership!;
  const name = displayName(viewer.profile, "resident");
  const [avatarUrl, unread] = await Promise.all([
    resolveAvatarUrl(viewer.profile?.avatar_url),
    unreadCount(viewer.userId!),
  ]);

  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#main"
        className="bg-background focus:ring-ring sr-only z-50 rounded-md border px-3 py-2 text-sm focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:ring-2"
      >
        Skip to content
      </a>
      <NotificationsRealtime userId={viewer.userId!} />
      <AppHeader
        name={name}
        buildingName={active.building?.name ?? "West Complex Village"}
        avatarUrl={avatarUrl}
        unreadCount={unread}
      />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-6 md:flex-row">
        <AppNav canManage={isManagerRole(active.role)} />
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
