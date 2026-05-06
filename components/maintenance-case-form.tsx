"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type CylinderOption = { id: string; serialNumber: string; sku: { name: string }; currentLocation: { name: string } };

export function MaintenanceCaseForm({ cylinders }: { cylinders: CylinderOption[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/safety/maintenance-cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cylinderId: formData.get("cylinderId"),
        reason: formData.get("reason"),
        certificateUploadPlaceholder: formData.get("certificateUploadPlaceholder") || undefined,
        documentUploadPlaceholder: formData.get("documentUploadPlaceholder") || undefined
      })
    });
    const result = (await response.json().catch(() => ({ error: "Unable to create maintenance case." }))) as { maintenanceCase?: { id: string }; error?: string };
    if (!response.ok) {
      setError(result.error ?? "Unable to create maintenance case.");
      setIsSubmitting(false);
      return;
    }
    router.push(`/safety/maintenance-cases/${result.maintenanceCase?.id}`);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <label className="block text-sm font-medium text-slate-700">
        Cylinder
        <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="cylinderId" required>
          <option value="">Select cylinder...</option>
          {cylinders.map((cylinder) => <option value={cylinder.id} key={cylinder.id}>{cylinder.serialNumber} - {cylinder.sku.name} - {cylinder.currentLocation.name}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Maintenance reason
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="reason" required />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="certificateUploadPlaceholder" placeholder="Certificate upload placeholder" />
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="documentUploadPlaceholder" placeholder="Document upload placeholder" />
      </div>
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70" type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Create maintenance case"}</button>
    </form>
  );
}
