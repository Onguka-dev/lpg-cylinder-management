import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TrendChip } from "@/components/trend-chip";

type MetricCardTone = "brand" | "success" | "warning" | "danger" | "info" | "neutral";

const iconTone: Record<MetricCardTone, string> = {
  brand: "bg-brand-50 text-brand-700",
  success: "bg-success-50 text-success-700",
  warning: "bg-warning-50 text-warning-700",
  danger: "bg-danger-50 text-danger-700",
  info: "bg-info-50 text-info-700",
  neutral: "bg-slate-100 text-slate-700"
};

export function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "brand",
  trend,
  className
}: {
  icon?: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  tone?: MetricCardTone;
  trend?: { value: string; direction?: "up" | "down" | "flat"; label?: string };
  className?: string;
}) {
  return (
    <div className={cn("min-h-36 rounded-brand border border-slate-200 bg-white p-5 shadow-panel", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-600">{label}</p>
          <p className="mt-2 break-words text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">{value}</p>
          {detail ? <p className="mt-1 text-sm leading-5 text-slate-500">{detail}</p> : null}
        </div>
        {Icon ? (
          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-brand", iconTone[tone])}>
            <Icon size={24} aria-hidden="true" />
          </div>
        ) : null}
      </div>
      {trend ? (
        <div className="mt-4">
          <TrendChip value={trend.value} direction={trend.direction} label={trend.label} />
        </div>
      ) : null}
    </div>
  );
}
