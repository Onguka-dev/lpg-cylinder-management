"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { Minus, Plus } from "lucide-react";
import { DEFAULT_CURRENCY, DEFAULT_CURRENCY_LOCALE } from "@/lib/currency";
import { paymentMethods, formatPaymentMethod } from "@/lib/refill-sales";

type Option = { id: string; name: string; code?: string; phone?: string };
type StockRow = { skuId: string; skuName: string; filledQuantity: number };
type PriceRow = { skuId: string; amount: number };

export function RefillOrderForm({
  customers,
  skus,
  stock,
  locations,
  isAdmin,
  prices = []
}: {
  customers: Option[];
  skus: Option[];
  stock: StockRow[];
  locations: Option[];
  isAdmin: boolean;
  prices?: PriceRow[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedSkuId, setSelectedSkuId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "MPESA" | "CARD">("CASH");
  const [emptyReturnNoQr, setEmptyReturnNoQr] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const quantity = 1;
  const selectedPrice = prices.find((price) => price.skuId === selectedSkuId)?.amount ?? 0;
  const selectedStock = stock.find((row) => row.skuId === selectedSkuId)?.filledQuantity ?? 0;

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
            kraPin: formData.get("kraPin") || undefined,
            category: formData.get("category"),
            address: formData.get("address"),
            status: "ACTIVE",
            documentPlaceholder: formData.get("documentPlaceholder") || undefined,
            notes: formData.get("customerNotes") || undefined
          }
        : undefined,
      skuId: formData.get("skuId"),
      locationId: formData.get("locationId") || undefined,
      filledCylinderCode: formData.get("filledCylinderCode"),
      emptyReturnCylinderCode: emptyReturnNoQr ? undefined : formData.get("emptyReturnCylinderCode"),
      emptyReturnNoQr,
      emptyReturnSerialNumber: emptyReturnNoQr ? formData.get("emptyReturnSerialNumber") : undefined,
      emptyReturnSizeKg: emptyReturnNoQr ? formData.get("emptyReturnSizeKg") : undefined,
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
    <form className="space-y-5 pb-24 sm:pb-0" onSubmit={handleSubmit}>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
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
          <TextInput label="KRA PIN" name="kraPin" />
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
          <TextInput label="Document Placeholder" name="documentPlaceholder" />
          <TextInput label="Customer Notes" name="customerNotes" />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          SKU / Cylinder Size
          <select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" name="skuId" required value={selectedSkuId} onChange={(event) => setSelectedSkuId(event.target.value)}>
            <option value="">Select SKU...</option>
            {skus.map((sku) => {
              const available = stock.find((row) => row.skuId === sku.id)?.filledQuantity ?? 0;
              return <option value={sku.id} key={sku.id}>{sku.name} - {available} filled available</option>;
            })}
          </select>
        </label>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Exchange refill</p>
              <p className="mt-1 text-xs text-slate-500">Filled out / empty returned</p>
            </div>
            <span className="rounded-full bg-success-50 px-3 py-1 text-xs font-bold text-success-700">Exchange</span>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-400" disabled type="button" title="Current refill workflow supports one cylinder exchange per transaction">
              <Minus size={16} aria-hidden="true" />
            </button>
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-500">Quantity</p>
              <p className="text-2xl font-bold text-slate-950">{quantity}</p>
            </div>
            <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-400" disabled type="button" title="Current refill workflow supports one cylinder exchange per transaction">
              <Plus size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        {isAdmin ? (
          <label className="block text-sm font-semibold text-slate-700">
            Sales Location
            <select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" name="locationId">
              <option value="">Select location...</option>
              {locations.map((location) => (
                <option value={location.id} key={location.id}>{location.code} - {location.name}</option>
              ))}
            </select>
          </label>
        ) : null}

        <TextInput label="Outgoing full cylinder scan" name="filledCylinderCode" placeholder="Scan filled cylinder barcode / serial" required />
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:col-span-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input className="h-4 w-4 rounded border-slate-300" checked={emptyReturnNoQr} onChange={(event) => setEmptyReturnNoQr(event.target.checked)} type="checkbox" />
            Returned empty has no QR/barcode
          </label>
          {emptyReturnNoQr ? (
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput label="Returned empty serial number" name="emptyReturnSerialNumber" placeholder="Enter cylinder serial number" required />
              <label className="block text-sm font-medium text-slate-700">
                Returned empty size
                <select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" name="emptyReturnSizeKg" required defaultValue="">
                  <option value="">Select size...</option>
                  <option value="6">6kg</option>
                  <option value="13">13kg</option>
                  <option value="50">50kg</option>
                </select>
              </label>
            </div>
          ) : (
            <TextInput label="Returned empty cylinder scan" name="emptyReturnCylinderCode" placeholder="Scan returned empty barcode / serial" required />
          )}
        </div>

        <label className="block text-sm font-semibold text-slate-700">
          Payment Method
          <select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" name="paymentMethod" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as "CASH" | "MPESA" | "CARD")}>
            {paymentMethods.map((method) => (
              <option value={method} key={method}>{formatPaymentMethod(method)}</option>
            ))}
          </select>
        </label>
        <TextInput label={paymentMethod === "MPESA" ? "Mobile money number / reference" : "Payment Reference Placeholder"} name="paymentReference" placeholder={paymentMethod === "MPESA" ? "+254..." : "Cash/card reference if available"} />
      </div>

      <section className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-brand-950">Invoice preview</p>
            <p className="mt-1 text-sm text-brand-800">Stock available: {selectedSkuId ? selectedStock : "Select SKU"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-brand-700">Total amount</p>
            <p className="text-2xl font-bold text-brand-950">{formatMoney(selectedPrice * quantity)}</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-white p-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-slate-600">Refill item</span>
            <span className="font-semibold text-slate-950">{selectedSkuId ? skus.find((sku) => sku.id === selectedSkuId)?.name : "Not selected"}</span>
          </div>
          <div className="mt-2 flex justify-between gap-4">
            <span className="text-slate-600">Qty x price</span>
            <span className="font-semibold text-slate-950">{quantity} x {formatMoney(selectedPrice)}</span>
          </div>
          <div className="mt-2 flex justify-between gap-4">
            <span className="text-slate-600">Discount</span>
            <span className="font-semibold text-slate-950">Placeholder</span>
          </div>
        </div>
      </section>

      <label className="block text-sm font-medium text-slate-700">
        Notes
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="notes" />
      </label>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="sticky bottom-20 z-10 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-panel backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <button className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Confirming..." : "Proceed to payment / close"}
        </button>
        <button className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 sm:w-auto" type="button" onClick={() => router.back()}>
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
      <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" name={name} {...props} />
    </label>
  );
}

function tabClass(active: boolean) {
  return active
    ? "rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
    : "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700";
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(DEFAULT_CURRENCY_LOCALE, {
    style: "currency",
    currency: DEFAULT_CURRENCY,
    maximumFractionDigits: 0
  }).format(value);
}
