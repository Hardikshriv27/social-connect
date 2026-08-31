import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-ink-muted">{label}</p>
        <Icon className="h-4 w-4 text-ink-muted" strokeWidth={1.75} />
      </div>
      <p className="mt-3 text-[26px] font-semibold leading-none tracking-tight text-ink">
        {value}
      </p>
    </div>
  );
}
