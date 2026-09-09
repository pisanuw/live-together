/** Human date for post/comment timestamps, e.g. "Sep 9, 2026". */
export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
