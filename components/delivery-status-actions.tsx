"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  failedDeliveryReasons,
  formatDeliveryStatus,
  formatFailedDeliveryReason,
  nextDeliveryStatuses,
  type DeliveryStatusKey
} from "@/lib/deliveries";

export function DeliveryStatusActions({ deliveryId, status }: { deliveryId: string; status: DeliveryStatusKey }) {
  const router = useRouter();
  const nextStatuses = nextDeliveryStatuses(status);
  const [selectedStatus, setSelectedStatus] = useState<DeliveryStatusKey | "">(nextStatuses[0] ?? "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStatus) return;
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const payload = {
      status: selectedStatus,
      failedReason: formData.get("failedReason") || undefined,
      otp: formData.get("otp") || undefined,
      signaturePlaceholder: formData.get("signaturePlaceholder") || undefined,
      photoPlaceholder: formData.get("photoPlaceholder") || undefined,
      gpsLatitude: formData.get("gpsLatitude") || undefined,
      gpsLongitude: formData.get("gpsLongitude") || undefined,
      customerRemarks: formData.get("customerRemarks") || undefined,
      exceptionNotes: formData.get("exceptionNotes") || undefined
    };

    const response = await fetch(`/api/deliveries/${deliveryId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = (await response.json().catch(() => ({ error: "Unable to update delivery." }))) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Unable to update delivery.");
      setIsSubmitting(false);
      return;
    }
    router.refresh();
    setIsSubmitting(false);
  }

  if (!nextStatuses.length) {
    return <p className="text-sm text-slate-500">No further delivery actions are available.</p>;
  }

  const needsReason = ["FAILED", "RETURNED", "EXCEPTION"].includes(selectedStatus);

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block text-sm font-medium text-slate-700">
        Next Status
        <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as DeliveryStatusKey)}>
          {nextStatuses.map((nextStatus) => (
            <option value={nextStatus} key={nextStatus}>{formatDeliveryStatus(nextStatus)}</option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        {needsReason ? (
          <label className="block text-sm font-medium text-slate-700">
            Failed Delivery Reason
            <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="failedReason" required>
              <option value="">Select reason...</option>
              {failedDeliveryReasons.map((reason) => (
                <option value={reason} key={reason}>{formatFailedDeliveryReason(reason)}</option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block text-sm font-medium text-slate-700">
          OTP
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="otp" placeholder="4-8 digit customer OTP" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          GPS Latitude
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="gpsLatitude" placeholder="-1.292100" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          GPS Longitude
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="gpsLongitude" placeholder="36.821900" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Digital Signature Placeholder
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="signaturePlaceholder" placeholder="Signature captured placeholder" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Photo Upload Placeholder
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="photoPlaceholder" placeholder="pod-photo-placeholder.jpg" />
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Customer Remarks
        <textarea className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="customerRemarks" />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Exception Notes
        <textarea className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="exceptionNotes" />
      </label>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Updating..." : "Update delivery"}
      </button>
    </form>
  );
}
