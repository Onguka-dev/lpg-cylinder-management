"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatOrderStatus, nextStatuses, type OrderStatusKey } from "@/lib/orders";

export function OrderStatusActions({ orderId, status }: { orderId: string; status: OrderStatusKey }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const statuses = nextStatuses(status);

  async function updateStatus(nextStatus: string) {
    setError("");
    setBusy(nextStatus);
    const response = await fetch(`/api/orders/${orderId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });
    const result = (await response.json().catch(() => ({ error: "Unable to update status." }))) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Unable to update status.");
      setBusy("");
      return;
    }
    router.refresh();
    setBusy("");
  }

  if (!statuses.length) return <p className="text-sm text-slate-500">No further workflow actions are available.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {statuses.map((nextStatus) => (
          <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70" type="button" onClick={() => updateStatus(nextStatus)} disabled={busy === nextStatus} key={nextStatus}>
            {busy === nextStatus ? "Working..." : formatOrderStatus(nextStatus)}
          </button>
        ))}
      </div>
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
