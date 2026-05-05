"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import type { MasterDataConfig, MasterDataField } from "@/lib/master-data-ui";

type MasterDataFormRecord = {
  id?: string;
  code?: string;
  name?: string;
  description?: string | null;
  amount?: string | number | null;
  rate?: string | number | null;
  capacityKg?: number | null;
  threshold?: number | null;
  parentId?: string | null;
  isActive?: boolean;
};

type ParentOption = {
  id: string;
  code: string;
  name: string;
};

type MasterDataFormProps = {
  config: MasterDataConfig;
  typeSlug: string;
  record?: MasterDataFormRecord;
  parentOptions: ParentOption[];
};

export function MasterDataForm({
  config,
  typeSlug,
  record,
  parentOptions
}: MasterDataFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(record?.id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      code: formData.get("code"),
      name: formData.get("name"),
      description: formData.get("description") || undefined,
      amount: valueOrNull(formData.get("amount")),
      rate: valueOrNull(formData.get("rate")),
      capacityKg: valueOrNull(formData.get("capacityKg")),
      threshold: valueOrNull(formData.get("threshold")),
      parentId: formData.get("parentId") || null,
      isActive: formData.get("isActive") === "on"
    };

    const response = await fetch(
      isEditing
        ? `/api/master-data/${typeSlug}/${record?.id}`
        : `/api/master-data/${typeSlug}`,
      {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const result = (await response.json().catch(() => ({
      error: "Unable to save this master data record."
    }))) as { record?: { id: string }; error?: string };

    if (!response.ok) {
      setError(result.error ?? "Unable to save this master data record.");
      setIsSubmitting(false);
      return;
    }

    router.push(`/admin/master-data/${typeSlug}/${result.record?.id ?? record?.id}`);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput label="Code" name="code" defaultValue={record?.code} required />
        <TextInput label="Name" name="name" defaultValue={record?.name} required />
      </div>

      {hasField(config.fields, "description") ? (
        <label className="block text-sm font-medium text-slate-700">
          Description
          <textarea
            className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            name="description"
            defaultValue={record?.description ?? ""}
          />
        </label>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {hasField(config.fields, "amount") ? (
          <TextInput label="Amount" name="amount" type="number" min="0" step="0.01" defaultValue={record?.amount ?? undefined} />
        ) : null}
        {hasField(config.fields, "rate") ? (
          <TextInput label="Rate %" name="rate" type="number" min="0" max="100" step="0.01" defaultValue={record?.rate ?? undefined} />
        ) : null}
        {hasField(config.fields, "capacityKg") ? (
          <TextInput label="Capacity Kg" name="capacityKg" type="number" min="1" step="1" defaultValue={record?.capacityKg ?? undefined} />
        ) : null}
        {hasField(config.fields, "threshold") ? (
          <TextInput label="Threshold" name="threshold" type="number" min="0" step="1" defaultValue={record?.threshold ?? undefined} />
        ) : null}
      </div>

      {hasField(config.fields, "parentId") ? (
        <label className="block text-sm font-medium text-slate-700">
          Related record
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            name="parentId"
            defaultValue={record?.parentId ?? ""}
          >
            <option value="">None</option>
            {parentOptions.map((option) => (
              <option value={option.id} key={option.id}>
                {option.code} - {option.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          className="h-4 w-4 rounded border-slate-300 text-brand-600"
          type="checkbox"
          name="isActive"
          defaultChecked={record?.isActive ?? true}
        />
        Active
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
          {isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Create record"}
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
  defaultValue?: string | number;
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

function valueOrNull(value: FormDataEntryValue | null) {
  return value === null || value === "" ? null : Number(value);
}

function hasField(fields: MasterDataField[], field: MasterDataField) {
  return fields.includes(field);
}
