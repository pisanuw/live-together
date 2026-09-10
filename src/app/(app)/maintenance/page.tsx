import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "cn";

import { RequestCard } from "@/components/maintenance/request-card";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/context";
import { isManagerRole } from "@/lib/auth/types";
import { listRequests, type RequestScope } from "@/lib/maintenance/queries";

const SCOPES: { value: RequestScope; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope: scopeParam } = await searchParams;
  const scope: RequestScope =
    scopeParam === "closed" || scopeParam === "all" ? scopeParam : "open";

  const viewer = await getViewer();
  const membership = viewer.activeMembership!;
  const isManager = isManagerRole(membership.role);

  const requests = await listRequests(
    membership.building_id,
    viewer.userId!,
    isManager,
    scope
  );

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maintenance</h1>
          <p className="text-muted-foreground text-sm">
            {isManager
              ? "Triage and track requests from residents."
              : "File a request and follow its progress."}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/maintenance/new">
            <Plus data-icon="inline-start" />
            New request
          </Link>
        </Button>
      </header>

      <div className="flex gap-1.5">
        {SCOPES.map((s) => (
          <Link
            key={s.value}
            href={
              s.value === "open"
                ? "/maintenance"
                : `/maintenance?scope=${s.value}`
            }
            aria-current={scope === s.value ? "true" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              scope === s.value
                ? "bg-foreground text-background border-transparent"
                : "text-muted-foreground hover:bg-muted/60"
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="bg-muted/40 text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
          {scope === "open"
            ? "No open requests."
            : scope === "closed"
              ? "No closed requests."
              : "No requests yet."}
        </div>
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => (
            <li key={request.id}>
              <RequestCard request={request} showCreator={isManager} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
