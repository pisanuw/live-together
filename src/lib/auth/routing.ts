import type { Membership } from "@/lib/auth/types";

export type ViewerStatus = "unauthenticated" | "none" | "pending" | "approved";

interface ViewerLike {
  userId: string | null;
  activeMembership: Pick<Membership, "status"> | null;
}

/**
 * Pure decision function for post-auth routing. Kept free of I/O so it is
 * unit-testable.
 */
export function viewerStatus(viewer: ViewerLike): ViewerStatus {
  if (!viewer.userId) return "unauthenticated";
  if (!viewer.activeMembership) return "none";
  if (viewer.activeMembership.status === "approved") return "approved";
  return "pending";
}

/** Where an authenticated request should go, or null to stay on the page. */
export function destinationFor(status: ViewerStatus): string | null {
  switch (status) {
    case "unauthenticated":
      return "/login";
    case "approved":
      return null;
    default:
      // "none" and "pending" both wait for manager approval.
      return "/pending";
  }
}
