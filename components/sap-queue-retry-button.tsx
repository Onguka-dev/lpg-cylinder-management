"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SapQueueRetryButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function retry(forceFailure = false) {
    setBusy(true);
    setError("");
    const response = await fetch("/api/integrations/sap-queue/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, forceFailure })
    });
    const result = (await response.json().catch(() => ({ error: "Unable to retry SAP posting." }))) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(result.error ?? "Unable to retry SAP posting.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-70" type="button" disabled={busy} onClick={() => retry(false)}>
          {busy ? "Retrying..." : "Retry"}
        </button>
        <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-70" type="button" disabled={busy} onClick={() => retry(true)}>
          Fail mock
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
