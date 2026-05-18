"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { formatReconciliationLabel, reconciliationCountModes, reconciliationCountStatuses, reconciliationScopes } from "@/lib/reconciliations";

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
  countLines?: {
    skuId: string;
    status: string;
    actualCount: number;
    scannedCount?: number | null;
    countMode: string;
    notes?: string | null;
  }[];
};

export function ReconciliationForm({
  reconciliation,
  users,
  currentUserId,
  currentRole,
  skus
}: {
  reconciliation?: ReconciliationRecord;
  users: UserOption[];
  currentUserId: string;
  currentRole: string;
  skus: { id: string; name: string; code: string }[];
}) {
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
    const countLines = Array.from({ length: Number(formData.get("countLineCount") ?? 0) }).flatMap((_, index) => {
      const skuId = String(formData.get(`countLines.${index}.skuId`) ?? "");
      const status = String(formData.get(`countLines.${index}.status`) ?? "");
      const actualCount = String(formData.get(`countLines.${index}.actualCount`) ?? "");
      if (!skuId || !status || actualCount.trim() === "") return [];
      return [{
        skuId,
        status,
        actualCount,
        scannedCount: formData.get(`countLines.${index}.scannedCount`) || undefined,
        countMode: formData.get(`countLines.${index}.countMode`) || "SUMMARY",
        notes: formData.get(`countLines.${index}.notes`) || undefined
      }];
    });
    const payload = {
      reconciliationDate: formData.get("reconciliationDate"),
      scope: formData.get("scope"),
      ownerId: canPickOwner ? formData.get("ownerId") : currentUserId,
      actualClosingStock: formData.get("actualClosingStock") || undefined,
      actualCash: formData.get("actualCash"),
      stockExplanation: formData.get("stockExplanation") || undefined,
      paymentExplanation: formData.get("paymentExplanation") || undefined,
      countLines
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
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="actualClosingStock" type="number" min="0" defaultValue={reconciliation?.actualClosingStock ?? ""} placeholder="Optional when physical count lines are entered" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Actual cash collected
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="actualCash" type="number" min="0" step="0.01" defaultValue={reconciliation ? String(reconciliation.actualCash) : ""} required />
        </label>
      </div>
      <PhysicalCountLines countLines={reconciliation?.countLines ?? []} skus={skus} />
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

function PhysicalCountLines({
  countLines,
  skus
}: {
  countLines: NonNullable<ReconciliationRecord["countLines"]>;
  skus: { id: string; name: string; code: string }[];
}) {
  const rows = [...countLines, ...Array.from({ length: Math.max(3, 6 - countLines.length) }, () => ({ skuId: "", status: "FILLED_AT_SELLING_POINT", actualCount: "" as unknown as number, scannedCount: null, countMode: "SUMMARY", notes: "" }))];

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-950">Physical count by size and status</h2>
        <p className="mt-1 text-sm text-slate-500">Enter counted rows for the location. Leave blank rows empty. Scan mode can record scanned count separately while keeping the actual count as the closing quantity.</p>
      </div>
      <input name="countLineCount" type="hidden" value={rows.length} />
      <div className="mt-4 space-y-3">
        {rows.map((line, index) => (
          <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr_1.4fr]" key={index}>
            <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name={`countLines.${index}.skuId`} defaultValue={line.skuId}>
              <option value="">Cylinder size</option>
              {skus.map((sku) => <option value={sku.id} key={sku.id}>{sku.code} - {sku.name}</option>)}
            </select>
            <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name={`countLines.${index}.status`} defaultValue={line.status}>
              {reconciliationCountStatuses.map((status) => <option value={status} key={status}>{formatReconciliationLabel(status)}</option>)}
            </select>
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name={`countLines.${index}.actualCount`} type="number" min="0" placeholder="Actual" defaultValue={line.skuId ? line.actualCount : ""} />
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name={`countLines.${index}.scannedCount`} type="number" min="0" placeholder="Scanned" defaultValue={line.scannedCount ?? ""} />
            <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name={`countLines.${index}.countMode`} defaultValue={line.countMode}>
              {reconciliationCountModes.map((mode) => <option value={mode} key={mode}>{formatReconciliationLabel(mode)}</option>)}
            </select>
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name={`countLines.${index}.notes`} placeholder="Count notes" defaultValue={line.notes ?? ""} />
          </div>
        ))}
      </div>
    </section>
  );
}
