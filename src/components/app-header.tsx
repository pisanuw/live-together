import Link from "next/link";
import { Bell } from "lucide-react";

import { Avatar } from "@/components/avatar";
import { SignOutButton } from "@/components/sign-out-button";

export function AppHeader({
  name,
  buildingName,
  avatarUrl,
  unreadCount,
}: {
  name: string;
  buildingName: string;
  avatarUrl: string | null;
  unreadCount: number;
}) {
  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 p-4">
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
            WCV
          </span>
          <span className="font-semibold">{buildingName}</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm sm:inline">{name}</span>
          <Link
            href="/notifications"
            aria-label={
              unreadCount > 0
                ? `Notifications (${unreadCount} unread)`
                : "Notifications"
            }
            className="hover:bg-muted relative inline-flex size-8 items-center justify-center rounded-lg transition-colors"
          >
            <Bell className="size-4" />
            {unreadCount > 0 ? (
              <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-medium">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Link>
          <Avatar url={avatarUrl} name={name} />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
