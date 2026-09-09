import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { SignOutButton } from "@/components/sign-out-button";

export function AppHeader({
  name,
  buildingName,
  avatarUrl,
}: {
  name: string;
  buildingName: string;
  avatarUrl: string | null;
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
          <Avatar url={avatarUrl} name={name} />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
