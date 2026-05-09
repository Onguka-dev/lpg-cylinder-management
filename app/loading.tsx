function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-brand bg-slate-200/80 ${className}`} />;
}

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6" role="status" aria-live="polite" aria-label="Loading page content">
      <section className="space-y-3">
        <p className="text-sm font-semibold text-brand-700">Loading Wells Gas workspace</p>
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-9 w-full max-w-xl" />
        <SkeletonBlock className="h-5 w-full max-w-3xl" />
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <SkeletonBlock className="h-36" key={index} />
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <SkeletonBlock className="h-80" />
        <SkeletonBlock className="h-80" />
      </section>
    </div>
  );
}
