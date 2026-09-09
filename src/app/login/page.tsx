import { redirect } from "next/navigation";

import { SubmitButton } from "@/components/submit-button";
import { signInWithGoogle, signInWithMagicLink } from "@/lib/auth/actions";
import { getViewer } from "@/lib/auth/context";
import { viewerStatus } from "@/lib/auth/routing";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const status = viewerStatus(await getViewer());
  if (status === "approved") redirect("/");
  if (status === "pending" || status === "none") redirect("/pending");

  const { error, sent } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-8">
      <div className="space-y-1 text-center">
        <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
          WCV
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          West Complex Village
        </h1>
        <p className="text-muted-foreground text-sm">
          Sign in to your community app
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      {sent ? (
        <p className="rounded-md border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
          Check your email for a sign-in link.
        </p>
      ) : null}

      <form action={signInWithGoogle}>
        <SubmitButton
          variant="outline"
          className="w-full"
          pendingText="Redirecting to Google…"
        >
          Continue with Google
        </SubmitButton>
      </form>

      <div className="text-muted-foreground flex items-center gap-3 text-xs">
        <span className="bg-border h-px flex-1" />
        or
        <span className="bg-border h-px flex-1" />
      </div>

      <form action={signInWithMagicLink} className="space-y-3">
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          autoComplete="email"
          className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
        />
        <SubmitButton className="w-full" pendingText="Sending link…">
          Email me a magic link
        </SubmitButton>
      </form>

      <p className="text-muted-foreground text-center text-xs">
        Access is limited to residents. New sign-ins await manager approval.
      </p>
    </main>
  );
}
