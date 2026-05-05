"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MasterDataStatusButton({
  id,
  typeSlug,
  isActive
}: {
  id: string;
  typeSlug: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    setIsSubmitting(true);
    await fetch(`/api/master-data/${typeSlug}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive })
    });
    router.refresh();
    setIsSubmitting(false);
  }

  return (
    <button
      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
      type="button"
      onClick={handleClick}
      disabled={isSubmitting}
    >
      {isSubmitting ? "Updating..." : isActive ? "Deactivate" : "Reactivate"}
    </button>
  );
}
