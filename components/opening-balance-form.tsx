"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { cylinderStatuses, formatCylinderStatus } from "@/lib/inventory";

type Option = {
  id: string;
  code: string;
  name: string;
};

export function OpeningBalanceForm({
  skus,
  locations
}: {
  skus: Option[];
  locations: Option[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/inventory/opening-balances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference: formData.get("reference"),
        skuId: formData.get("skuId"),
        locationId: formData.get("locationId"),
        status: formData.get("status"),
        quantity: formData.get("quantity"),
        serialPrefix: formData.get("serialPrefix"),
        notes: formData.get("notes") || undefined
      })
    });

    const result = (await response.json().catch(() => ({
      error: "Unable to create opening balance."
    }))) as { error?: string };

    if (!response.ok) {
      setError(result.error ?? "Unable to create opening balance.");
      setIsSubmitting(false);
      return;
    }

    router.push("/inventory/cylinders");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Reference" name="reference" required />
        <Input label="Serial Prefix" name="serialPrefix" required />
        <Select label="SKU/Size" name="skuId" options={skus} />
        <Select label="Location" name="locationId" options={locations} />
        <label className="block text-sm font-medium text-slate-700">
          Status
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="status" defaultValue="EMPTY">
            {cylinderStatuses.map((status) => (
              <option value={status} key={status}>
                {formatCylinderStatus(status)}
              </option>
            ))}
          </select>
        </label>
        <Input label="Quantity" name="quantity" type="number" min="1" max="100" defaultValue="1" required />
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Notes
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="notes" />
      </label>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      <button
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating..." : "Create opening balance"}
      </button>
    </form>
  );
}

function Input({
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

function Select({ label, name, options }: { label: string; name: string; options: Option[] }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name={name} required>
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
