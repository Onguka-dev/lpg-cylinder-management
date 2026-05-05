"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import {
  formatMovementType,
  inventoryMovementTypes
} from "@/lib/inventory-movements";
import { cylinderStatuses, formatCylinderStatus } from "@/lib/inventory";

type Option = {
  id: string;
  code: string;
  name: string;
};

export function InventoryMovementForm({
  skus,
  locations,
  assignedLocationId,
  restrictToAssignedLocation
}: {
  skus: Option[];
  locations: Option[];
  assignedLocationId?: string | null;
  restrictToAssignedLocation?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const defaultLocation = restrictToAssignedLocation ? assignedLocationId ?? "" : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      reference: formData.get("reference"),
      type: formData.get("type"),
      skuId: formData.get("skuId"),
      sourceLocationId: formData.get("sourceLocationId") || undefined,
      destinationLocationId: formData.get("destinationLocationId") || undefined,
      sourceStatus: formData.get("sourceStatus") || undefined,
      destinationStatus: formData.get("destinationStatus"),
      requestedQuantity: formData.get("requestedQuantity"),
      notes: formData.get("notes") || undefined
    };

    const response = await fetch("/api/inventory/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = (await response.json().catch(() => ({
      error: "Unable to save this movement."
    }))) as { movement?: { id: string }; error?: string };

    if (!response.ok) {
      setError(result.error ?? "Unable to save this movement.");
      setIsSubmitting(false);
      return;
    }

    router.push(`/inventory/movements/${result.movement?.id}`);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput label="Reference" name="reference" placeholder="TRF-0001" required />
        <label className="block text-sm font-medium text-slate-700">
          Movement Type
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="type" defaultValue="TRANSFER">
            {inventoryMovementTypes.map((type) => (
              <option value={type} key={type}>{formatMovementType(type)}</option>
            ))}
          </select>
        </label>
        <SelectInput label="SKU/Size" name="skuId" options={skus} />
        <TextInput label="Quantity" name="requestedQuantity" type="number" min="1" max="200" required />
        <SelectInput label="Source Location" name="sourceLocationId" options={locations} defaultValue="" disabled={false} />
        <SelectInput
          label="Destination Location"
          name="destinationLocationId"
          options={locations}
          defaultValue={defaultLocation}
          disabled={Boolean(restrictToAssignedLocation && assignedLocationId)}
        />
        {restrictToAssignedLocation && assignedLocationId ? (
          <input type="hidden" name="destinationLocationId" value={assignedLocationId} />
        ) : null}
        <StatusSelect label="Source Status" name="sourceStatus" defaultValue="FILLED" />
        <StatusSelect label="Destination Status" name="destinationStatus" defaultValue="FILLED" />
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Notes
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="notes" />
      </label>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Request movement"}
        </button>
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" type="button" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function TextInput({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name={name} {...props} />
    </label>
  );
}

function SelectInput({
  label,
  name,
  options,
  defaultValue = "",
  disabled = false
}: {
  label: string;
  name: string;
  options: Option[];
  defaultValue?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" name={name} defaultValue={defaultValue} disabled={disabled}>
        <option value="">Select...</option>
        {options.map((option) => (
          <option value={option.id} key={option.id}>
            {option.code} - {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusSelect({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name={name} defaultValue={defaultValue}>
        <option value="">Select...</option>
        {cylinderStatuses.map((status) => (
          <option value={status} key={status}>{formatCylinderStatus(status)}</option>
        ))}
      </select>
    </label>
  );
}
