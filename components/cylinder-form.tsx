"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { cylinderStatuses, formatCylinderStatus } from "@/lib/inventory";

type Option = {
  id: string;
  code: string;
  name: string;
};

type CylinderFormRecord = {
  id?: string;
  serialNumber?: string;
  barcode?: string | null;
  skuId?: string;
  manufactureDate?: string | null;
  inspectionDueDate?: string | null;
  expiryDate?: string | null;
  hydroTestDueDate?: string | null;
  unsafeStatus?: boolean;
  quarantinedStatus?: boolean;
  maintenanceStatus?: string;
  currentLocationId?: string;
  status?: string;
  notes?: string | null;
};

export function CylinderForm({
  cylinder,
  skus,
  locations
}: {
  cylinder?: CylinderFormRecord;
  skus: Option[];
  locations: Option[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(cylinder?.id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      serialNumber: formData.get("serialNumber"),
      barcode: formData.get("barcode") || undefined,
      skuId: formData.get("skuId"),
      manufactureDate: formData.get("manufactureDate") || undefined,
      inspectionDueDate: formData.get("inspectionDueDate") || undefined,
      expiryDate: formData.get("expiryDate") || undefined,
      hydroTestDueDate: formData.get("hydroTestDueDate") || undefined,
      unsafeStatus: formData.get("unsafeStatus") === "on",
      quarantinedStatus: formData.get("quarantinedStatus") === "on",
      maintenanceStatus: formData.get("maintenanceStatus"),
      currentLocationId: formData.get("currentLocationId"),
      status: formData.get("status"),
      notes: formData.get("notes") || undefined
    };

    const response = await fetch(
      isEditing ? `/api/cylinders/${cylinder?.id}` : "/api/cylinders",
      {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const result = (await response.json().catch(() => ({
      error: "Unable to save this cylinder."
    }))) as { cylinder?: { id: string }; error?: string };

    if (!response.ok) {
      setError(result.error ?? "Unable to save this cylinder.");
      setIsSubmitting(false);
      return;
    }

    router.push(`/inventory/cylinders/${result.cylinder?.id ?? cylinder?.id}`);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput label="Serial Number" name="serialNumber" defaultValue={cylinder?.serialNumber} required />
        <TextInput label="Barcode/RFID Placeholder" name="barcode" defaultValue={cylinder?.barcode ?? undefined} />
        <SelectInput label="SKU/Size" name="skuId" defaultValue={cylinder?.skuId ?? ""} options={skus} />
        <label className="block text-sm font-medium text-slate-700">
          Status
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            name="status"
            defaultValue={cylinder?.status ?? "EMPTY"}
          >
            {cylinderStatuses.map((status) => (
              <option value={status} key={status}>
                {formatCylinderStatus(status)}
              </option>
            ))}
          </select>
        </label>
        <TextInput label="Manufacture Date" name="manufactureDate" type="date" defaultValue={cylinder?.manufactureDate ?? undefined} />
        <TextInput label="Inspection Due Date" name="inspectionDueDate" type="date" defaultValue={cylinder?.inspectionDueDate ?? undefined} />
        <TextInput label="Expiry Date" name="expiryDate" type="date" defaultValue={cylinder?.expiryDate ?? undefined} />
        <TextInput label="Hydro-Test Due Date" name="hydroTestDueDate" type="date" defaultValue={cylinder?.hydroTestDueDate ?? undefined} />
        <label className="block text-sm font-medium text-slate-700">
          Maintenance Status
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" name="maintenanceStatus" defaultValue={cylinder?.maintenanceStatus ?? "NONE"}>
            <option value="NONE">None</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="CLEARED">Cleared</option>
            <option value="SCRAP_PLACEHOLDER">Scrap Placeholder</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input name="unsafeStatus" type="checkbox" defaultChecked={cylinder?.unsafeStatus ?? false} />
          Unsafe cylinder
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input name="quarantinedStatus" type="checkbox" defaultChecked={cylinder?.quarantinedStatus ?? false} />
          Quarantined cylinder
        </label>
      </div>

      <SelectInput
        label="Current Location"
        name="currentLocationId"
        defaultValue={cylinder?.currentLocationId ?? ""}
        options={locations}
      />

      <label className="block text-sm font-medium text-slate-700">
        Notes
        <textarea
          className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          name="notes"
          defaultValue={cylinder?.notes ?? ""}
        />
      </label>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Create cylinder"}
        </button>
        <button
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          type="button"
          onClick={() => router.back()}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function TextInput({
  label,
  name,
  defaultValue,
  ...props
}: {
  label: string;
  name: string;
  defaultValue?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "defaultValue">) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        name={name}
        defaultValue={defaultValue ?? ""}
        {...props}
      />
    </label>
  );
}

function SelectInput({
  label,
  name,
  defaultValue,
  options
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: Option[];
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        name={name}
        defaultValue={defaultValue}
        required
      >
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
