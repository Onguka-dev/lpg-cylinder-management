"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { billingPaymentMethods, formatBillingLabel } from "@/lib/billing";

export function BillingPaymentForm({ invoiceId, balance }: { invoiceId: string; balance: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const payload = {
      amount: formData.get("amount"),
      method: formData.get("method"),
      reference: formData.get("reference") || undefined,
      refundPlaceholder: formData.get("refundPlaceholder") || undefined
    };
    const response = await fetch(`/api/billing/invoices/${invoiceId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = (await response.json().catch(() => ({ error: "Unable to record payment." }))) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Unable to record payment.");
      setIsSubmitting(false);
      return;
    }
    router.refresh();
    setIsSubmitting(false);
    event.currentTarget.reset();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Amount
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="amount" type="number" min="0.01" max={balance} step="0.01" required />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Method
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="method" defaultValue="CASH">
            {billingPaymentMethods.map((method) => <option value={method} key={method}>{formatBillingLabel(method)}</option>)}
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Reference
        <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="reference" placeholder="Mpesa/card/online reference placeholder" />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Refund Placeholder
        <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="refundPlaceholder" placeholder="Refund note placeholder" />
      </label>
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Recording..." : "Record payment"}
      </button>
    </form>
  );
}
