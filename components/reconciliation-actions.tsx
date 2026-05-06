"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function ReconciliationActions({
  reconciliationId,
  status,
  canSubmit,
  canReview,
  canOverride,
  actualClosingStock,
  actualCash
}: {
  reconciliationId: string;
  status: string;
  canSubmit: boolean;
  canReview: boolean;
  canOverride: boolean;
  actualClosingStock: number;
  actualCash: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function postAction(url: string, payload?: Record<string, FormDataEntryValue | string>) {
    setError("");
    setBusy(url);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {})
    });
    const result = (await response.json().catch(() => ({ error: "Unable to update reconciliation." }))) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Unable to update reconciliation.");
      setBusy("");
      return;
    }
    setBusy("");
    router.refresh();
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    void postAction(`/api/reconciliations/${reconciliationId}/review`, {
      status: formData.get("status") ?? "APPROVED",
      supervisorNotes: formData.get("supervisorNotes") ?? ""
    });
  }

  function override(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    void postAction(`/api/reconciliations/${reconciliationId}/override`, {
      actualClosingStock: formData.get("actualClosingStock") ?? String(actualClosingStock),
      actualCash: formData.get("actualCash") ?? actualCash,
      stockExplanation: formData.get("stockExplanation") ?? "",
      paymentExplanation: formData.get("paymentExplanation") ?? "",
      adminOverrideReason: formData.get("adminOverrideReason") ?? ""
    });
  }

  return (
    <div className="space-y-5">
      {canSubmit && ["DRAFT", "RETURNED"].includes(status) ? (
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70" type="button" disabled={busy.includes("/submit")} onClick={() => postAction(`/api/reconciliations/${reconciliationId}/submit`)}>
          {busy.includes("/submit") ? "Submitting..." : "Submit for review"}
        </button>
      ) : null}

      {canReview && status === "SUBMITTED" ? (
        <form className="grid gap-3 md:grid-cols-[220px_1fr_auto]" onSubmit={review}>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="status" defaultValue="APPROVED">
            <option value="APPROVED">Approve and lock</option>
            <option value="RETURNED">Return for correction</option>
          </select>
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="supervisorNotes" placeholder="Supervisor notes" />
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70" type="submit" disabled={busy.includes("/review")}>
            {busy.includes("/review") ? "Saving..." : "Record review"}
          </button>
        </form>
      ) : null}

      {canOverride && status === "APPROVED" ? (
        <form className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4" onSubmit={override}>
          <div>
            <h3 className="text-sm font-semibold text-amber-950">Admin override</h3>
            <p className="mt-1 text-sm text-amber-800">Approved reconciliations are locked. This override updates final actuals and writes an audit log.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input className="rounded-lg border border-amber-300 px-3 py-2 text-sm" name="actualClosingStock" type="number" min="0" defaultValue={actualClosingStock} required />
            <input className="rounded-lg border border-amber-300 px-3 py-2 text-sm" name="actualCash" type="number" min="0" step="0.01" defaultValue={actualCash} required />
            <input className="rounded-lg border border-amber-300 px-3 py-2 text-sm" name="stockExplanation" placeholder="Stock explanation" />
            <input className="rounded-lg border border-amber-300 px-3 py-2 text-sm" name="paymentExplanation" placeholder="Payment explanation" />
          </div>
          <textarea className="min-h-20 w-full rounded-lg border border-amber-300 px-3 py-2 text-sm" name="adminOverrideReason" placeholder="Admin override reason" required />
          <button className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70" type="submit" disabled={busy.includes("/override")}>
            {busy.includes("/override") ? "Overriding..." : "Save override"}
          </button>
        </form>
      ) : null}

      {status === "APPROVED" && !canOverride ? <p className="text-sm text-slate-500">Approved reconciliation is locked against editing.</p> : null}
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
