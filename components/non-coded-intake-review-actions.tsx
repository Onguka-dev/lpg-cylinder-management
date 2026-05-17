"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function NonCodedIntakeReviewActions({ intakeId }: { intakeId: string }) {
  const router = useRouter();
  const [action, setAction] = useState("TAG_AND_APPROVE");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/inventory/non-coded-intakes/${intakeId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        cylinderCode: formData.get("cylinderCode") || undefined,
        newBarcode: formData.get("newBarcode") || undefined,
        newQrCode: formData.get("newQrCode") || undefined,
        reviewNotes: formData.get("reviewNotes") || undefined
      })
    });
    const result = (await response.json().catch(() => ({ error: "Unable to review intake." }))) as { error?: string };
    setIsSubmitting(false);
    if (!response.ok) {
      setError(result.error ?? "Unable to review intake.");
      return;
    }
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <label className="block text-sm font-medium text-slate-700">
        Review Action
        <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" value={action} onChange={(event) => setAction(event.target.value)}>
          <option value="TAG_AND_APPROVE">Tag and approve into inventory</option>
          <option value="CREATE_PENDING_CYLINDER">Send to tagging queue</option>
          <option value="LINK_EXISTING">Link to existing cylinder</option>
          <option value="ESCALATE">Escalate investigation</option>
          <option value="REJECT">Reject / non-company cylinder</option>
        </select>
      </label>

      {action === "LINK_EXISTING" ? (
        <label className="block text-sm font-medium text-slate-700">
          Existing Cylinder Barcode / QR / Serial
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 font-mono text-sm" name="cylinderCode" />
        </label>
      ) : null}

      {action === "TAG_AND_APPROVE" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            New Barcode
            <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 font-mono text-sm" name="newBarcode" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            New QR Code
            <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 font-mono text-sm" name="newQrCode" />
          </label>
        </div>
      ) : null}

      <label className="block text-sm font-medium text-slate-700">
        Review Notes
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" name="reviewNotes" />
      </label>
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button className="rounded-lg bg-brand-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}
