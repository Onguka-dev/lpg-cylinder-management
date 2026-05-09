import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

export function BrandMark({
  compact = false,
  inverse = false,
  className
}: {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandLogo variant={compact ? "icon" : inverse ? "dark" : "light"} compact={compact} />
    </div>
  );
}
