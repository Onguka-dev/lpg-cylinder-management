"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { formatReconciliationLabel, reconciliationScopes } from "@/lib/reconciliations";

type UserOption = {
  id: string;
  name: string;
  email: string;
  role: { name: string };
  location?: { name: string } | null;
};

type ReconciliationRecord = {
  id: string;
  reconciliationDate: Date | string;
  scope: string;
  ownerId: string;
  actualClosingStock: number;
  actualCash: unknown;
  stockExplanation?: string | null;
  paymentExplanation?: string | null;
};

export function ReconciliationForm({ reconciliation, users, currentUserId, currentRole }: { reconciliation?: ReconciliationRecord; users: UserOption[]; currentUserId: string; currentRole: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const defaultScope = currentRole === "WAREHOUSE_MANAGER" ? "WAREHOUSE" : currentRole === "MSO" ? "MSO" : currentRole === "SERVICE_CENTRE_STAFF" ? "SERVICE_CENTRE" : "RSO";
  const canPickOwner = ["ADMIN", "WAREHOUSE_MANAGER"].includes(currentRole);
  const isEditing = Boolean(reconciliation?.id);
  const dateValue = reconciliation?.reconciliationDate ? new Date(reconciliation.reconciliationDate).toISOString().slice(0, 10) : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const payload = {
      reconciliationDate: formData.get("reconciliationDate"),
      scope: formData.get("scope"),
      ownerId: canPickOwner ? formData.get("ownerId") : currentUserId,
      actualClosingStock: formData.get("actualClosingStock"),
      actualCash: formData.get("actualCash"),
      stockExplanation: formData.get("stockExplanation") || undefined,
      paymentExplanation: formData.get("paymentExplanation") || undefined
    };
    const response = await fetch(isEditing ? `/api/reconciliations/${reconciliation?.id}` : "/api/reconciliations", {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = (await response.json().catch(() => ({ error: "Unable to save reconciliation." }))) as { reconciliation?: { id: string }; error?: string };
    if (!response.ok) {
      setError(result.error ?? "Unable to save reconciliation.");
      setIsSubmitting(false);
      return;
    }
    router.push(`/reconciliations/${result.reconciliation?.id ?? reconciliation?.id}`);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Reconciliation date
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="reconciliationDate" type="date" defaultValue={dateValue} required />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Scope
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="scope" defaultValue={reconciliation?.scope ?? defaultScope}>
            {reconciliationScopes.map((scope) => <option value={scope} key={scope}>{formatReconciliationLabel(scope)}</option>)}
          </select>
        </label>
        {canPickOwner ? (
          <label className="block text-sm font-medium text-slate-700 md:col-span-2">
            Accountable user
            <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="ownerId" defaultValue={reconciliation?.ownerId ?? ""} required>
              <option value="">Select user...</option>
              {users.map((user) => (
                <option value={user.id} key={user.id}>
                  {formatReconciliationLabel(user.role.name)} account - {user.email}{user.location ? ` - ${user.location.name}` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="block text-sm font-medium text-slate-700">
          Actual closing stock
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="actualClosingStock" type="number" min="0" defaultValue={reconciliation?.actualClosingStock ?? ""} required />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Actual cash collected
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="actualCash" type="number" min="0" step="0.01" defaultValue={reconciliation ? String(reconciliation.actualCash) : ""} required />
        </label>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Stock variance explanation
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="stockExplanation" defaultValue={reconciliation?.stockExplanation ?? ""} placeholder="Required operational explanation when actual stock differs from expected stock." />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Payment variance explanation
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="paymentExplanation" defaultValue={reconciliation?.paymentExplanation ?? ""} placeholder="Required cash accountability explanation when collections do not match." />
      </label>
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <div className="flex flex-wrap gap-3">
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70" type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : isEditing ? "Save reconciliation" : "Create reconciliation"}</button>
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" type="button" onClick={() => router.back()}>Cancel</button>
      </div>
    </form>
  );
}
