import Image from "next/image";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  variant?: "light" | "dark" | "icon";
  compact?: boolean;
  className?: string;
};

export function BrandLogo({ variant = "light", compact = false, className }: BrandLogoProps) {
  const src = variant === "icon" ? brand.logo.icon : brand.logo[variant];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src={src}
        alt={`${brand.companyName} ${brand.appName} logo`}
        width={compact || variant === "icon" ? 56 : 270}
        height={compact || variant === "icon" ? 56 : 70}
        className={cn(compact ? "h-11 w-11" : "h-14 w-auto max-w-[15rem]")}
        priority={variant !== "icon"}
        unoptimized
      />
      {brand.assetsArePlaceholders ? (
        <span className="sr-only">
          Temporary placeholder logo. Replace files in public/brand with official Wells Gas artwork.
        </span>
      ) : null}
    </div>
  );
}
