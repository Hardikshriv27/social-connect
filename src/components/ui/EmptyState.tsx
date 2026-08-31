import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-16 text-center">
      <Icon className="mb-3.5 h-6 w-6 text-ink-muted" strokeWidth={1.5} />
      <h3 className="text-[13.5px] font-medium text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-[13.5px] leading-relaxed text-ink-muted">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}