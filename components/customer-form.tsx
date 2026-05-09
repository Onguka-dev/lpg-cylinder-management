"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { customerCategories, customerStatuses } from "@/lib/customers";

type CustomerFormRecord = {
  id?: string;
  name?: string;
  phone?: string;
  proofReference?: string;
  category?: string;
  address?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  status?: string;
  creditLimit?: string | number | null;
  notes?: string | null;
};

export function CustomerForm({ customer }: { customer?: CustomerFormRecord }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(customer?.id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const idType = formData.get("idType");
    const notes = formData.get("notes");
    const payload = {
      name: formData.get("name"),
      phone: formData.get("phone"),
      proofReference: formData.get("proofReference"),
      category: formData.get("category"),
      address: formData.get("address"),
      latitude: valueOrNull(formData.get("latitude")),
      longitude: valueOrNull(formData.get("longitude")),
      status: formData.get("status"),
      creditLimit: valueOrNull(formData.get("creditLimit")),
      notes: [idType ? `ID type: ${idType}` : "", notes || ""].filter(Boolean).join(" | ") || undefined
    };

    const response = await fetch(
      isEditing ? `/api/customers/${customer?.id}` : "/api/customers",
      {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const result = (await response.json().catch(() => ({
      error: "Unable to save this customer."
    }))) as { customer?: { id: string }; error?: string };

    if (!response.ok) {
      setError(result.error ?? "Unable to save this customer.");
      setIsSubmitting(false);
      return;
    }

    router.push(`/customers/${result.customer?.id ?? customer?.id}`);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-bold text-brand-700 shadow-sm">
            Photo
          </div>
          <div>
            <p className="text-sm font-bold text-slate-950">Customer photo placeholder</p>
            <p className="mt-1 text-sm leading-5 text-slate-500">Capture/upload can be connected later; registration continues with the existing customer API.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextInput label="Full Name" name="name" defaultValue={customer?.name} required />
        <TextInput label="Phone" name="phone" defaultValue={customer?.phone} required />
        <label className="block text-sm font-medium text-slate-700">
          ID Type
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            name="idType"
            defaultValue="NIDA"
          >
            <option value="NIDA">NIDA</option>
            <option value="PASSPORT">Passport</option>
            <option value="DRIVING_LICENSE">Driving license</option>
            <option value="BUSINESS_REGISTRATION">Business registration</option>
          </select>
        </label>
        <TextInput
          label="ID/NIDA/Passport Reference"
          name="proofReference"
          defaultValue={customer?.proofReference}
          required
        />
        <label className="block text-sm font-medium text-slate-700">
          Customer Category
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            name="category"
            defaultValue={customer?.category ?? "DOMESTIC"}
          >
            {customerCategories.map((category) => (
              <option value={category} key={category}>
                {formatEnum(category)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Address
        <textarea
          className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          name="address"
          defaultValue={customer?.address ?? ""}
          required
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <TextInput label="Latitude Placeholder" name="latitude" type="number" step="0.000001" defaultValue={customer?.latitude ?? undefined} />
        <TextInput label="Longitude Placeholder" name="longitude" type="number" step="0.000001" defaultValue={customer?.longitude ?? undefined} />
        <TextInput label="Credit Limit Placeholder" name="creditLimit" type="number" min="0" step="0.01" defaultValue={customer?.creditLimit ?? undefined} />
        <label className="block text-sm font-medium text-slate-700">
          Customer Status
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            name="status"
            defaultValue={customer?.status ?? "ACTIVE"}
          >
            {customerStatuses.map((status) => (
              <option value={status} key={status}>
                {formatEnum(status)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Notes
        <textarea
          className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          name="notes"
          defaultValue={customer?.notes ?? ""}
        />
      </label>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-20 z-10 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-panel backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <button
          className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Register customer"}
        </button>
        <button
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 sm:w-auto"
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
  defaultValue?: string | number;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "defaultValue">) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        name={name}
        defaultValue={defaultValue ?? ""}
        {...props}
      />
    </label>
  );
}

function valueOrNull(value: FormDataEntryValue | null) {
  return value === null || value === "" ? null : Number(value);
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
