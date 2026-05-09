import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandMark({
  compact = false,
  className
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center" aria-hidden="true">
        <svg className="h-12 w-12" viewBox="0 0 64 64" role="img">
          <defs>
            <linearGradient id="wells-drop-blue" x1="14" x2="48" y1="6" y2="55" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0b8fe8" />
              <stop offset="1" stopColor="#0757b8" />
            </linearGradient>
            <linearGradient id="wells-drop-green" x1="14" x2="48" y1="16" y2="58" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2fc84f" />
              <stop offset="1" stopColor="#0b8f3b" />
            </linearGradient>
          </defs>
          <path
            d="M34.5 3.5C44.8 17.2 55 28.4 55 41.2C55 53.4 45.2 61 33.1 61C20.8 61 10.5 53.6 10.5 41.4C10.5 32.5 17.1 24.4 24 16.6C21.9 25.4 24.5 32.1 31.1 36.9C27.6 25.2 29.4 14.1 34.5 3.5Z"
            fill="url(#wells-drop-blue)"
          />
          <path
            d="M19.5 55.7C9.9 51.1 7.6 41.8 11.5 32.7C14.3 26.1 20.2 20.8 25.5 15.2C23.3 25.8 26.4 35.5 35.2 42.9C26.4 41.4 20.6 35.9 17.5 26.6C13.2 38.2 14.1 48 19.5 55.7Z"
            fill="url(#wells-drop-green)"
          />
          <path
            d="M31.9 54.8C25.5 54.8 20.7 50.5 20.7 44.8C20.7 39.1 25.3 34.5 31.9 30C38.5 34.5 43.1 39.1 43.1 44.8C43.1 50.5 38.3 54.8 31.9 54.8Z"
            fill="white"
            opacity="0.92"
          />
          <path
            d="M31.9 50.8C27.9 50.8 25.2 48.3 25.2 44.9C25.2 41.7 27.5 38.7 31.9 35.7C36.3 38.7 38.6 41.7 38.6 44.9C38.6 48.3 35.9 50.8 31.9 50.8Z"
            fill="#19a64c"
          />
        </svg>
      </div>
      {!compact ? (
        <div className="min-w-0">
          <p className="truncate text-base font-bold leading-5 tracking-normal text-brand-700">{brand.name}</p>
          <p className="truncate text-xs font-semibold text-blue-600">{brand.tagline}</p>
        </div>
      ) : null}
    </div>
  );
}
