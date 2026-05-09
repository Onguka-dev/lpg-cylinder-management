import { BrandLogo } from "@/components/brand-logo";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandHeaderProps = {
  inverse?: boolean;
  compact?: boolean;
  className?: string;
};

export function BrandHeader({ inverse = false, compact = false, className }: BrandHeaderProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandLogo variant={inverse ? "dark" : "light"} compact={compact} />
      {!compact ? (
        <div className="sr-only">
          <p>{brand.companyName}</p>
          <p>{brand.appName}</p>
          <p>{brand.tagline}</p>
        </div>
      ) : null}
    </div>
  );
}
