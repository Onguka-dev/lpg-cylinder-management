"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Paperclip } from "lucide-react";
import {
  complaintPriorities,
  complaintTypes,
  formatComplaintValue
} from "@/lib/customer-complaints";

type Option = {
  id: string;
  name: string;
  code?: string;
  phone?: string;
};

export function CustomerComplaintForm({
  customers,
  locations,
  assignedLocationId
}: {
  customers: Option[];
  locations: Option[];
  assignedLocationId?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      customerId: formData.get("customerId") || undefined,
      locationId: assignedLocationId ?? formData.get("locationId") ?? undefined,
      type: formData.get("type"),
      priority: formData.get("priority"),
      description: formData.get("description"),
      attachmentPlaceholder: formData.get("attachmentPlaceholder") || undefined,
      escalationNotes: formData.get("escalationNotes") || undefined
    };

    const response = await fetch("/api/customer-complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = (await response.json().catch(() => ({ error: "Unable to submit this complaint." }))) as {
      complaint?: { id: string };
      error?: string;
    };

    if (!response.ok) {
      setError(result.error ?? "Unable to submit this complaint.");
      setIsSubmitting(false);
      return;
    }

    router.push("/retail-sales/complaints");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Customer
          <select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" name="customerId">
            <option value="">Walk-in / not selected</option>
            {customers.map((customer) => (
              <option value={customer.id} key={customer.id}>
                {customer.name} {customer.phone ? `- ${customer.phone}` : ""}
              </option>
            ))}
          </select>
        </label>

        {assignedLocationId ? (
          <input name="locationId" type="hidden" value={assignedLocationId} />
        ) : (
          <label className="block text-sm font-semibold text-slate-700">
            Retail point
            <select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" name="locationId">
              <option value="">Select location...</option>
              {locations.map((location) => (
                <option value={location.id} key={location.id}>
                  {location.code} - {location.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block text-sm font-semibold text-slate-700">
          Complaint type
          <select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" name="type" defaultValue="SERVICE_QUALITY">
            {complaintTypes.map((type) => (
              <option value={type} key={type}>{formatComplaintValue(type)}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Priority
          <select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" name="priority" defaultValue="MEDIUM">
            {complaintPriorities.map((priority) => (
              <option value={priority} key={priority}>{formatComplaintValue(priority)}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm font-semibold text-slate-700">
        Description
        <textarea className="mt-1 min-h-32 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" name="description" placeholder="Describe the complaint, customer impact, and any immediate action taken." required />
      </label>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-700">
            <Paperclip size={20} aria-hidden="true" />
          </div>
          <label className="block flex-1 text-sm font-semibold text-slate-700">
            Attachment placeholder
            <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" name="attachmentPlaceholder" placeholder="Photo, receipt or voice note reference placeholder" />
          </label>
        </div>
      </div>

      <label className="block text-sm font-semibold text-slate-700">
        Escalation notes
        <textarea className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" name="escalationNotes" placeholder="Supervisor, safety, payment or logistics escalation notes." />
      </label>

      {error ? <p className="rounded-xl border border-danger-200 bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-700">{error}</p> : null}

      <div className="sticky bottom-20 z-10 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-panel backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <button className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Submitting..." : "Submit complaint / escalation"}
        </button>
      </div>
    </form>
  );
}
