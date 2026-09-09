import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/sign-out-button";
import { getViewer } from "@/lib/auth/context";
import { viewerStatus } from "@/lib/auth/routing";
import { displayName } from "@/lib/auth/types";

export default async function PendingPage() {
  const viewer = await getViewer();
  const status = viewerStatus(viewer);
  if (status === "unauthenticated") redirect("/login");
  if (status === "approved") redirect("/");

  const name = displayName(viewer.profile, "there");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-amber-500/15 text-xl text-amber-600 dark:text-amber-400">
        ⏳
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Hi {name}, you&apos;re almost in
        </h1>
        <p className="text-muted-foreground">
          Your request to join <strong>West Complex Village</strong> is awaiting
          approval from a community manager. You&apos;ll get access as soon as
          they approve you.
        </p>
      </div>
      <SignOutButton />
    </main>
  );
}
