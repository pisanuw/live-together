import {
  categoryLabel,
  priorityLabel,
  statusLabel,
} from "@/lib/maintenance/helpers";
import type {
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
} from "@/lib/maintenance/types";

const pill =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";

const STATUS_CLASS: Record<MaintenanceStatus, string> = {
  open: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  in_progress:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  resolved:
    "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
  closed: "text-muted-foreground",
  cancelled: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
};

const PRIORITY_CLASS: Record<MaintenancePriority, string> = {
  low: "text-muted-foreground",
  normal: "text-muted-foreground",
  high: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  urgent: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
};

export function StatusBadge({ status }: { status: MaintenanceStatus }) {
  return (
    <span className={`${pill} ${STATUS_CLASS[status]}`}>
      {statusLabel(status)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: MaintenancePriority }) {
  return (
    <span className={`${pill} ${PRIORITY_CLASS[priority]}`}>
      {priorityLabel(priority)}
    </span>
  );
}

export function CategoryBadge({ category }: { category: MaintenanceCategory }) {
  return (
    <span className={`${pill} text-muted-foreground`}>
      {categoryLabel(category)}
    </span>
  );
}
