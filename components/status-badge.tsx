import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type StatusBadgeTone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

const toneClasses: Record<StatusBadgeTone, string> = {
  success: "border-success-100 bg-success-50 text-success-700",
  warning: "border-warning-100 bg-warning-50 text-warning-700",
  danger: "border-danger-100 bg-danger-50 text-danger-700",
  info: "border-info-100 bg-info-50 text-info-700",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  brand: "border-brand-100 bg-brand-50 text-brand-700"
};

export function StatusBadge({
  children,
  tone = "neutral",
  className
}: {
  children: ReactNode;
  tone?: StatusBadgeTone;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold", toneClasses[tone], className)}>
      {children}
    </span>
  );
}
