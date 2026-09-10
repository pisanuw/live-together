import "server-only";

/**
 * Request-time "now" in milliseconds. Server Components render once per request,
 * so reading the clock here is well-defined; isolating it in this (non-component)
 * module keeps the react-hooks purity lint focused on real client-render bugs.
 */
export function nowMs(): number {
  return Date.now();
}
