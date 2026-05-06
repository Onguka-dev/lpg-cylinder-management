"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { fieldDeliveryStatuses, formatFieldDeliveryStatus } from "@/lib/field-sales";
import { formatPaymentMethod, paymentMethods } from "@/lib/refill-sales";

type Option = { id: string; name: string; code?: string; phone?: string };
type StockRow = { skuId: string; skuName: string; filledQuantity: number; emptyQuantity: number };

export function FieldSaleForm({
  customers,
  skus,
  stock,
  assignment
}: {
  customers: Option[];
  skus: Option[];
  stock: StockRow[];
  assignment: { vehicleName: string; routeName: string; zoneName: string };
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      customerId: mode === "existing" ? formData.get("customerId") : undefined,
      customer: mode === "new"
        ? {
            name: formData.get("customerName"),
            phone: formData.get("phone"),
            proofReference: formData.get("proofReference"),
            category: formData.get("category"),
            address: formData.get("address"),
            status: "ACTIVE",
            notes: formData.get("customerNotes") || undefined
          }
        : undefined,
      skuId: formData.get("skuId"),
      paymentMethod: formData.get("paymentMethod"),
      paymentReference: formData.get("paymentReference") || undefined,
      deliveryStatus: formData.get("deliveryStatus"),
      discrepancyReport: formData.get("discrepancyReport") || undefined,
      offlineSyncPlaceholder: "Offline sync hook reserved for Stage 15."
    };

    const response = await fetch("/api/field-sales/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = (await response.json().catch(() => ({ error: "Unable to close this field sale." }))) as {
      sale?: { id: string };
      error?: string;
    };

    if (!response.ok) {
      setError(result.error ?? "Unable to close this field sale.");
      setIsSubmitting(false);
      return;
    }

    router.push(`/field-sales/sales/${result.sale?.id}`);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-3">
        <Assignment label="Vehicle" value={assignment.vehicleName} />
        <Assignment label="Route" value={assignment.routeName} />
        <Assignment label="Zone" value={assignment.zoneName} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="grid grid-cols-2 gap-2">
          <button className={tabClass(mode === "existing")} type="button" onClick={() => setMode("existing")}>Existing</button>
          <button className={tabClass(mode === "new")} type="button" onClick={() => setMode("new")}>Register</button>
        </div>
      </div>

      {mode === "existing" ? (
        <label className="block text-sm font-medium text-slate-700">
          Customer
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" name="customerId" required>
            <option value="">Select customer...</option>
            {customers.map((customer) => (
              <option value={customer.id} key={customer.id}>{customer.name} {customer.phone ? `- ${customer.phone}` : ""}</option>
            ))}
          </select>
        </label>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Customer Name" name="customerName" required />
          <TextInput label="Phone" name="phone" required />
          <TextInput label="ID/Passport/Proof Ref" name="proofReference" required />
          <label className="block text-sm font-medium text-slate-700">
            Category
            <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" name="category" defaultValue="DOMESTIC">
              <option value="DOMESTIC">Domestic</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="INDUSTRIAL">Industrial</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <TextInput label="Address" name="address" required />
          </div>
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Customer Notes
            <textarea className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="customerNotes" />
          </label>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          SKU / Cylinder Size
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" name="skuId" required>
            <option value="">Select SKU...</option>
            {skus.map((sku) => {
              const available = stock.find((row) => row.skuId === sku.id);
              return <option value={sku.id} key={sku.id}>{sku.name} - {available?.filledQuantity ?? 0} filled on vehicle</option>;
            })}
          </select>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Delivery Status
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" name="deliveryStatus" defaultValue="DELIVERED">
            {fieldDeliveryStatuses.map((status) => (
              <option value={status} key={status}>{formatFieldDeliveryStatus(status)}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Payment Method
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" name="paymentMethod" defaultValue="CASH">
            {paymentMethods.map((method) => (
              <option value={method} key={method}>{formatPaymentMethod(method)}</option>
            ))}
          </select>
        </label>
        <TextInput label="Payment Reference Placeholder" name="paymentReference" placeholder="Mpesa/card reference if available" />
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Discrepancy Report
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="discrepancyReport" placeholder="Optional vehicle count, damage, or payment discrepancy" />
      </label>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-3 sm:flex">
        <button className="rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Closing..." : "Close field sale"}
        </button>
        <button className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700" type="button" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Assignment({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{value}</p>
    </div>
  );
}

function TextInput({ label, name, ...props }: { label: string; name: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" name={name} {...props} />
    </label>
  );
}

function tabClass(active: boolean) {
  return active
    ? "rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white"
    : "rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700";
}
