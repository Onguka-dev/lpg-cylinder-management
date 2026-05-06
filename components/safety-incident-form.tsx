"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { incidentSeverities, formatSafetyLabel } from "@/lib/safety";

type CylinderOption = { id: string; serialNumber: string };
type LocationOption = { id: string; code: string; name: string };

export function SafetyIncidentForm({ cylinders, locations }: { cylinders: CylinderOption[]; locations: LocationOption[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/safety/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cylinderId: formData.get("cylinderId") || undefined,
        title: formData.get("title"),
        severity: formData.get("severity"),
        incidentDate: formData.get("incidentDate"),
        locationId: formData.get("locationId") || undefined,
        description: formData.get("description"),
        correctiveAction: formData.get("correctiveAction") || undefined,
        certificateUploadPlaceholder: formData.get("certificateUploadPlaceholder") || undefined,
        photoUploadPlaceholder: formData.get("photoUploadPlaceholder") || undefined
      })
    });
    const result = (await response.json().catch(() => ({ error: "Unable to log incident." }))) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Unable to log incident.");
      setIsSubmitting(false);
      return;
    }
    router.push("/safety");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid gap-4 md:grid-cols-2">
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="title" placeholder="Incident title" required />
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="severity" defaultValue="LOW">
          {incidentSeverities.map((severity) => <option value={severity} key={severity}>{formatSafetyLabel(severity)}</option>)}
        </select>
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="incidentDate" type="date" required />
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="cylinderId" defaultValue="">
          <option value="">Cylinder optional...</option>
          {cylinders.map((cylinder) => <option value={cylinder.id} key={cylinder.id}>{cylinder.serialNumber}</option>)}
        </select>
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" name="locationId" defaultValue="">
          <option value="">Location optional...</option>
          {locations.map((location) => <option value={location.id} key={location.id}>{location.code} - {location.name}</option>)}
        </select>
      </div>
      <textarea className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="description" placeholder="Incident description" required />
      <textarea className="min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="correctiveAction" placeholder="Corrective action" />
      <div className="grid gap-4 md:grid-cols-2">
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="certificateUploadPlaceholder" placeholder="Certificate/document upload placeholder" />
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="photoUploadPlaceholder" placeholder="Photo upload placeholder" />
      </div>
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70" type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Log incident"}</button>
    </form>
  );
}
