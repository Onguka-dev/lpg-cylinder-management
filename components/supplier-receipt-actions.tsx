"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SupplierReceiptActions({
  receiptId,
  status
}: {
  receiptId: string;
  status: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function runAction(action: "review" | "post") {
    setError("");
    setIsSubmitting(true);
    const response = await fetch(`/api/inventory/supplier-receipts/${receiptId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    const result = (await response.json().catch(() => ({ error: "Unable to update receipt." }))) as { error?: string };

    if (!response.ok) {
      setError(result.error ?? "Unable to update receipt.");
      setIsSubmitting(false);
      return;
    }

    router.refresh();
  }

  if (status === "POSTED") return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {status === "DRAFT" ? (
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60" disabled={isSubmitting} onClick={() => runAction("review")} type="button">
            Mark reviewed
          </button>
        ) : null}
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={isSubmitting} onClick={() => runAction("post")} type="button">
          Post to stock
        </button>
      </div>
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
