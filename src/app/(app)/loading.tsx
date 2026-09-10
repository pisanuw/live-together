/** Skeleton shown in the content area during section navigations. */
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="bg-muted h-8 w-48 animate-pulse rounded-md" />
      <div className="bg-muted h-24 w-full animate-pulse rounded-lg" />
      <div className="bg-muted h-24 w-full animate-pulse rounded-lg" />
    </div>
  );
}
