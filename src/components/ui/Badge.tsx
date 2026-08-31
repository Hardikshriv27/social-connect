import { cn, statusStyles } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize",
        statusStyles(status),
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}