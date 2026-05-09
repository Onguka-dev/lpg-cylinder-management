import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("border-t border-slate-200 px-4 py-4 text-xs text-slate-500", className)}>
      <div className="mx-auto flex max-w-7xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <span>{brand.companyName}</span>
        <span>{brand.appName} - {brand.tagline}</span>
      </div>
    </footer>
  );
}
