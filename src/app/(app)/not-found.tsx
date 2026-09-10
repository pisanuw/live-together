import Link from "next/link";

import { Button } from "@/components/ui/button";

/** 404 within the app shell (e.g. a missing post/event/request id). */
export default function NotFound() {
  return (
    <div className="space-y-3 rounded-lg border border-dashed p-8 text-center">
      <h1 className="text-lg font-semibold">Not found</h1>
      <p className="text-muted-foreground text-sm">
        That page doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Button asChild size="sm" variant="outline">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
