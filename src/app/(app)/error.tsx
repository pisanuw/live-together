"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/** Error boundary for the app shell — keeps the nav/header while recovering. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for observability; the digest ties to server logs.
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-8 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground text-sm">
        That page hit an error. You can try again.
      </p>
      <Button size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
