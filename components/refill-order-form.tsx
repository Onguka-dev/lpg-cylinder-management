"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { paymentMethods, formatPaymentMethod } from "@/lib/refill-sales";

type Option = { id: string; name: string; code?: string; phone?: string };
type StockRow = { skuId: string; skuName: string; filledQuantity: number };

export function RefillOrderForm({
  customers,
  skus,
  stock,
  locations,
  isAdmin
}: {
  customers: Option[];
  skus: Option[];
  stock: StockRow[];
  locations: Option[];
  isAdmin: boolean;
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
            status: "ACTIVE"
          }
        : undefined,
      skuId: formData.get("skuId"),
      locationId: formData.get("locationId") || undefined,
      paymentMethod: formData.get("paymentMethod"),
      paymentReference: formData.get("paymentReference") || undefined,
      notes: formData.get("notes") || undefined
    };

    const response = await fetch("/api/retail/refill-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = (await response.json().catch(() => ({ error: "Unable to close this refill transaction." }))) as {
      order?: { id: string };
      error?: string;
    };

    if (!response.ok) {
      setError(result.error ?? "Unable to close this refill transaction.");
      setIsSubmitting(false);
      return;
    }

    router.push(`/retail-sales/refills/${result.order?.id}`);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex gap-2">
          <button className={tabClass(mode === "existing")} type="button" onClick={() => setMode("existing")}>Existing customer</button>
          <button className={tabClass(mode === "new")} type="button" onClick={() => setMode("new")}>Register customer</button>
        </div>
      </div>

      {mode === "existing" ? (
        <label className="block text-sm font-medium text-slate-700">
          Customer
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="customerId" required>
            <option value="">Select customer...</option>
            {customers.map((customer) => (
              <option value={customer.id} key={customer.id}>{customer.name} {customer.phone ? `- ${customer.phone}` : ""}</option>
            ))}
          </select>
        </label>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput label="Customer Name" name="customerName" required />
          <TextInput label="Phone" name="phone" required />
          <TextInput label="ID/Passport/Proof Ref" name="proofReference" required />
          <label className="block text-sm font-medium text-slate-700">
            Category
            <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="category" defaultValue="DOMESTIC">
              <option value="DOMESTIC">Domestic</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="INDUSTRIAL">Industrial</option>
            </select>
          </label>
          <div className="md:col-span-2">
            <TextInput label="Address" name="address" required />
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          SKU / Cylinder Size
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="skuId" required>
            <option value="">Select SKU...</option>
            {skus.map((sku) => {
              const available = stock.find((row) => row.skuId === sku.id)?.filledQuantity ?? 0;
              return <option value={sku.id} key={sku.id}>{sku.name} - {available} filled available</option>;
            })}
          </select>
        </label>

        {isAdmin ? (
          <label className="block text-sm font-medium text-slate-700">
            Sales Location
            <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="locationId">
              <option value="">Select location...</option>
              {locations.map((location) => (
                <option value={location.id} key={location.id}>{location.code} - {location.name}</option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block text-sm font-medium text-slate-700">
          Payment Method
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="paymentMethod" defaultValue="CASH">
            {paymentMethods.map((method) => (
              <option value={method} key={method}>{formatPaymentMethod(method)}</option>
            ))}
          </select>
        </label>
        <TextInput label="Payment Reference Placeholder" name="paymentReference" placeholder="Mpesa/card reference if available" />
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Notes
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="notes" />
      </label>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Closing..." : "Close refill transaction"}
        </button>
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" type="button" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function TextInput({ label, name, ...props }: { label: string; name: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name={name} {...props} />
    </label>
  );
}

function tabClass(active: boolean) {
  return active
    ? "rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
    : "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700";
}
