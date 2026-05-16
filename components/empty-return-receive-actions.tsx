"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function EmptyReturnReceiveActions({ movementId, defaultCodes, status }: { movementId: string; defaultCodes: string[]; status: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  if (status !== "DISPATCHED") return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/inventory/empty-return-transfers/${movementId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "receive",
        receivedCodes: parseCodes(String(formData.get("receivedCodes") ?? "")),
        receivingOfficerName: formData.get("receivingOfficerName") || undefined,
        remarks: formData.get("remarks") || undefined
      })
    });
    const result = (await response.json().catch(() => ({ error: "Unable to receive empty returns." }))) as { error?: string };
    setIsSubmitting(false);
    if (!response.ok) {
      setError(result.error ?? "Unable to receive empty returns.");
      return;
    }
    router.refresh();
  }

  return (
    <form className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4" onSubmit={submit}>
      <h2 className="text-base font-semibold text-slate-950">Warehouse receipt by scan</h2>
      <label className="block text-sm font-medium text-slate-700">
        Received empty cylinder codes
        <textarea className="mt-1 min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" name="receivedCodes" defaultValue={defaultCodes.join("\n")} required />
      </label>
      <label className="block text-sm font-medium text-slate-700">Receiving officer<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="receivingOfficerName" /></label>
      <label className="block text-sm font-medium text-slate-700">Receipt remarks<textarea className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="remarks" /></label>
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Receiving..." : "Receive at warehouse"}
      </button>
    </form>
  );
}

function parseCodes(value: string) {
  return value.split(/[\n,]+/).map((code) => code.trim()).filter(Boolean);
}
