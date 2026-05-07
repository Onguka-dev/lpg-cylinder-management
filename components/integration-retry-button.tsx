"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function IntegrationRetryButton({ id }: { id: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function retry() {
    setIsSubmitting(true);
    await fetch("/api/integrations/logs/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    router.refresh();
    setIsSubmitting(false);
  }

  return (
    <button className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-60" type="button" onClick={retry} disabled={isSubmitting}>
      {isSubmitting ? "Retrying..." : "Retry"}
    </button>
  );
}
