"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { formatBillingLabel, invoiceSourceTypes } from "@/lib/billing";

type SourceOption = { id: string; label: string };

export function InvoiceForm({ orders, refills }: { orders: SourceOption[]; refills: SourceOption[] }) {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<"CUSTOMER_ORDER" | "RETAIL_REFILL">("CUSTOMER_ORDER");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const payload = {
      sourceType,
      customerOrderId: sourceType === "CUSTOMER_ORDER" ? formData.get("sourceId") : undefined,
      refillOrderId: sourceType === "RETAIL_REFILL" ? formData.get("sourceId") : undefined,
      deliveryFeeAmount: formData.get("deliveryFeeAmount") || undefined,
      discountAmount: formData.get("discountAmount") || undefined,
      promotionPlaceholder: formData.get("promotionPlaceholder") || undefined,
      notes: formData.get("notes") || undefined
    };
    const response = await fetch("/api/billing/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = (await response.json().catch(() => ({ error: "Unable to create invoice." }))) as {
      invoice?: { id: string };
      error?: string;
    };
    if (!response.ok) {
      setError(result.error ?? "Unable to create invoice.");
      setIsSubmitting(false);
      return;
    }
    router.push(`/payments/invoices/${result.invoice?.id}`);
    router.refresh();
  }

  const options = sourceType === "CUSTOMER_ORDER" ? orders : refills;

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block text-sm font-medium text-slate-700">
        Invoice Source
        <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={sourceType} onChange={(event) => setSourceType(event.target.value as "CUSTOMER_ORDER" | "RETAIL_REFILL")}>
          {invoiceSourceTypes.map((type) => <option value={type} key={type}>{formatBillingLabel(type)}</option>)}
        </select>
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Source Record
        <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="sourceId" required>
          <option value="">Select...</option>
          {options.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
        </select>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Delivery Fee" name="deliveryFeeAmount" type="number" min="0" step="0.01" />
        <Field label="Discount" name="discountAmount" type="number" min="0" step="0.01" />
      </div>

      <Field label="Promotion Placeholder" name="promotionPlaceholder" placeholder="Promotion code or note placeholder" />
      <label className="block text-sm font-medium text-slate-700">
        Notes
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="notes" />
      </label>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <div className="flex gap-3">
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create invoice"}
        </button>
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" type="button" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, name, ...props }: { label: string; name: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name={name} {...props} />
    </label>
  );
}
