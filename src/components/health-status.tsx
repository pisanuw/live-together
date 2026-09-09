import { cn } from "cn";

export type CheckStatus = "ok" | "pending" | "error";

export interface HealthCheck {
  label: string;
  status: CheckStatus;
  detail?: string;
}

const STATUS_STYLES: Record<
  CheckStatus,
  { dot: string; text: string; symbol: string }
> = {
  ok: {
    dot: "bg-green-500",
    text: "text-green-600 dark:text-green-400",
    symbol: "✓",
  },
  pending: {
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    symbol: "•",
  },
  error: {
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    symbol: "✕",
  },
};

/**
 * Synchronous, presentational list of readiness checks. Kept free of async /
 * server APIs so it is unit-testable with Vitest + Testing Library.
 */
export function HealthStatus({ checks }: { checks: HealthCheck[] }) {
  return (
    <ul className="divide-border bg-card w-full max-w-md divide-y rounded-lg border">
      {checks.map((check) => {
        const style = STATUS_STYLES[check.status];
        return (
          <li
            key={check.label}
            className="flex items-start gap-3 p-3"
            data-status={check.status}
          >
            <span
              aria-hidden
              className={cn("mt-1 size-2.5 shrink-0 rounded-full", style.dot)}
            />
            <div className="min-w-0">
              <p className="text-card-foreground text-sm font-medium">
                {check.label}
              </p>
              {check.detail ? (
                <p className="text-muted-foreground truncate text-xs">
                  {check.detail}
                </p>
              ) : null}
            </div>
            <span className={cn("ml-auto text-sm font-semibold", style.text)}>
              {style.symbol}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
