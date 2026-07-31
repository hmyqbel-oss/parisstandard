import { STATUS_META, type CycleStatus } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: CycleStatus | null | undefined;
  className?: string;
}) {
  const meta = status ? STATUS_META[status] : null;
  if (!meta) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground",
          className,
        )}
      >
        No cycle
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-tight",
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
