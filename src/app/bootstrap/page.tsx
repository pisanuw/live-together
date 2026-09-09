import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/context";

import { claimAdmin } from "./actions";

export default async function BootstrapPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer.userId) redirect("/login");
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-8">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Bootstrap admin</h1>
        <p className="text-muted-foreground text-sm">
          Enter the superadmin secret to make yourself an admin of West Complex
          Village.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <form action={claimAdmin} className="space-y-3">
        <input
          type="password"
          name="secret"
          required
          placeholder="Superadmin secret"
          className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
        />
        <Button type="submit" className="w-full">
          Claim admin access
        </Button>
      </form>
    </main>
  );
}
