"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { inspectionResults, formatSafetyLabel } from "@/lib/safety";

export function MaintenanceCaseActions({ caseId, canManage }: { caseId: string; canManage: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function post(payload: Record<string, FormDataEntryValue | string>) {
    setError("");
    setBusy(String(payload.action));
    const response = await fetch(`/api/safety/maintenance-cases/${caseId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = (await response.json().catch(() => ({ error: "Unable to update case." }))) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Unable to update case.");
      setBusy("");
      return;
    }
    setBusy("");
    router.refresh();
  }

  function inspect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    void post({ action: "inspect", inspectionResult: formData.get("inspectionResult") ?? "PASSED", inspectionNotes: formData.get("inspectionNotes") ?? "" });
  }

  if (!canManage) return <p className="text-sm text-slate-500">Auditor view only. Maintenance actions are disabled.</p>;

  return (
    <div className="space-y-4">
      <form className="grid gap-3 md:grid-cols-[220px_1fr_auto]" onSubmit={inspect}>
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="inspectionResult" defaultValue="PASSED">
          {inspectionResults.map((result) => <option value={result} key={result}>{formatSafetyLabel(result)}</option>)}
        </select>
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="inspectionNotes" placeholder="Inspection notes" required />
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit" disabled={busy === "inspect"}>{busy === "inspect" ? "Saving..." : "Record inspection"}</button>
      </form>
      <div className="flex flex-wrap gap-3">
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" type="button" onClick={() => post({ action: "quarantine" })}>Move to quarantine</button>
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={() => post({ action: "approve-return", returnApprovalNotes: "Approved from Stage 12 safety review." })}>Approve return to stock</button>
        <button className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700" type="button" onClick={() => post({ action: "scrap-placeholder", scrapWriteOffPlaceholder: "Scrap/write-off placeholder pending final disposal workflow." })}>Scrap placeholder</button>
      </div>
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
