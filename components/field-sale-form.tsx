"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { Minus, Plus, Camera, MapPin } from "lucide-react";
import { DEFAULT_CURRENCY, DEFAULT_CURRENCY_LOCALE } from "@/lib/currency";
import { fieldDeliveryStatuses, formatFieldDeliveryStatus } from "@/lib/field-sales";
import { formatPaymentMethod, paymentMethods } from "@/lib/refill-sales";

type Option = { id: string; name: string; code?: string; phone?: string };
type StockRow = { skuId: string; skuName: string; filledQuantity: number; emptyQuantity: number };
type PriceRow = { skuId: string; amount: number };

export function FieldSaleForm({
  customers,
  skus,
  stock,
  assignment,
  prices = []
}: {
  customers: Option[];
  skus: Option[];
  stock: StockRow[];
  assignment: { vehicleName: string; routeName: string; zoneName: string };
  prices?: PriceRow[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedSkuId, setSelectedSkuId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "MPESA" | "CARD">("CASH");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const quantity = 1;
  const price = prices.find((row) => row.skuId === selectedSkuId)?.amount ?? 0;
  const selectedStock = stock.find((row) => row.skuId === selectedSkuId);

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
      paymentReference: truncate([formData.get("mobileMoneyNumber"), formData.get("transactionId"), formData.get("paymentReference")]
        .filter(Boolean)
        .join(" | "), 80) || undefined,
      deliveryStatus: formData.get("deliveryStatus"),
      discrepancyReport: buildDiscrepancy(formData),
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
    <form className="space-y-5 pb-24 sm:pb-0" onSubmit={handleSubmit}>
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-3">
        <Assignment label="Vehicle" value={assignment.vehicleName} />
        <Assignment label="Route" value={assignment.routeName} />
        <Assignment label="Zone" value={assignment.zoneName} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="grid grid-cols-2 gap-2">
          <button className={tabClass(mode === "existing")} type="button" onClick={() => setMode("existing")}>Search customer</button>
          <button className={tabClass(mode === "new")} type="button" onClick={() => setMode("new")}>Register customer</button>
        </div>
      </div>

      {mode === "existing" ? (
        <label className="block text-sm font-semibold text-slate-700">
          Customer
          <select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" name="customerId" required>
            <option value="">Select customer...</option>
            {customers.map((customer) => (
              <option value={customer.id} key={customer.id}>{customer.name} {customer.phone ? `- ${customer.phone}` : ""}</option>
            ))}
          </select>
        </label>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-brand-700">
                <Camera size={22} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-950">Photo placeholder</p>
                <p className="text-sm text-slate-500">Field customer photo capture can connect later.</p>
              </div>
            </div>
          </div>
          <TextInput label="Full Name" name="customerName" required />
          <TextInput label="Phone" name="phone" required />
          <TextInput label="National ID / Passport Reference" name="proofReference" required />
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

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-950">Order item</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Item / cylinder size
          <select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" name="skuId" required value={selectedSkuId} onChange={(event) => setSelectedSkuId(event.target.value)}>
            <option value="">Select SKU...</option>
            {skus.map((sku) => {
              const available = stock.find((row) => row.skuId === sku.id);
              return <option value={sku.id} key={sku.id}>{sku.name} - {available?.filledQuantity ?? 0} filled on vehicle</option>;
            })}
          </select>
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Sale type
          <select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" name="saleType" defaultValue="REFILL">
            <option value="REFILL">Refill / exchange</option>
            <option value="NEW_CYLINDER">New cylinder placeholder</option>
          </select>
        </label>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">Quantity</p>
          <div className="mt-3 flex items-center justify-between">
            <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-400" disabled type="button" title="Current field sale workflow supports one cylinder exchange">
              <Minus size={16} aria-hidden="true" />
            </button>
            <span className="text-3xl font-bold text-slate-950">{quantity}</span>
            <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-400" disabled type="button" title="Current field sale workflow supports one cylinder exchange">
              <Plus size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-brand-50 p-4">
          <p className="text-sm font-semibold text-brand-800">Price and total</p>
          <p className="mt-2 text-3xl font-bold text-brand-950">{formatMoney(price * quantity)}</p>
          <p className="mt-1 text-sm text-brand-800">{selectedStock?.filledQuantity ?? 0} filled / {selectedStock?.emptyQuantity ?? 0} empty on vehicle</p>
        </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" id="payment">
        <h2 className="text-base font-bold text-slate-950">Payment collection</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Delivery Status
          <select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" name="deliveryStatus" defaultValue="DELIVERED">
            {fieldDeliveryStatuses.map((status) => (
              <option value={status} key={status}>{formatFieldDeliveryStatus(status)}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Payment Method
          <select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" name="paymentMethod" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as "CASH" | "MPESA" | "CARD")}>
            {paymentMethods.map((method) => (
              <option value={method} key={method}>{formatPaymentMethod(method)}</option>
            ))}
          </select>
        </label>
        <TextInput label="Mobile money number" name="mobileMoneyNumber" placeholder={paymentMethod === "MPESA" ? "+254..." : "Optional"} />
        <TextInput label="Transaction ID" name="transactionId" placeholder="Mpesa/card/cash reference" />
        <TextInput label="Amount paid" name="amountPaid" value={String(price * quantity)} readOnly />
        <TextInput label="Payment Reference Placeholder" name="paymentReference" placeholder="Additional notes if available" />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-950">Proof of delivery</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextInput label="OTP" name="otpPlaceholder" placeholder="Customer OTP placeholder" />
          <TextInput label="Customer remarks" name="podCustomerRemarks" placeholder="Remarks placeholder" />
          <TextInput label="GPS latitude" name="gpsLatitudePlaceholder" placeholder="-1.292100" />
          <TextInput label="GPS longitude" name="gpsLongitudePlaceholder" placeholder="36.821900" />
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <MapPin className="text-brand-700" size={20} aria-hidden="true" />
            <p className="mt-2 text-sm font-bold text-slate-950">Signature placeholder</p>
            <p className="text-sm text-slate-500">Digital signature capture remains a placeholder here.</p>
          </div>
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <Camera className="text-brand-700" size={20} aria-hidden="true" />
            <p className="mt-2 text-sm font-bold text-slate-950">Photo upload placeholder</p>
            <p className="text-sm text-slate-500">Use delivery proof screen for live POD updates.</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" id="empty-return">
        <h2 className="text-base font-bold text-slate-950">Empty return collection</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextInput label="Returned item" name="returnedItem" placeholder="Matched to selected SKU" />
          <TextInput label="Quantity" name="emptyReturnQuantity" value="1" readOnly />
          <label className="block text-sm font-medium text-slate-700">
            Condition
            <select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" name="emptyReturnCondition" defaultValue="GOOD">
              <option value="GOOD">Good</option>
              <option value="DAMAGED">Damaged</option>
              <option value="LEAKING">Leaking</option>
            </select>
          </label>
          <TextInput label="Notes" name="emptyReturnNotes" placeholder="Empty return notes" />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" id="discrepancy">
        <h2 className="text-base font-bold text-slate-950">Discrepancy report</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextInput label="Stock shortage item" name="shortageItem" placeholder="SKU / item" />
          <TextInput label="Expected quantity" name="expectedQuantity" type="number" min="0" />
          <TextInput label="Actual quantity" name="actualQuantity" type="number" min="0" />
          <TextInput label="Difference" name="differenceQuantity" type="number" />
          <TextInput label="Reason" name="discrepancyReason" placeholder="Reason for variance" />
          <TextInput label="Photo placeholder" name="discrepancyPhoto" placeholder="Photo reference placeholder" />
        </div>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Discrepancy notes
          <textarea className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" name="discrepancyReport" placeholder="Optional vehicle count, damage, or payment discrepancy" />
        </label>
      </section>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="sticky bottom-20 z-10 grid gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-panel backdrop-blur sm:static sm:flex sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <button className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Recording..." : "Verify payment / close sale"}
        </button>
        <button className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700" type="button" onClick={() => router.back()}>
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
      <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" name={name} {...props} />
    </label>
  );
}

function tabClass(active: boolean) {
  return active
    ? "rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white"
    : "rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700";
}

function buildDiscrepancy(formData: FormData) {
  const report = formData.get("discrepancyReport");
  const parts = [
    report ? String(report) : "",
    formData.get("shortageItem") ? `Shortage item: ${formData.get("shortageItem")}` : "",
    formData.get("expectedQuantity") ? `Expected: ${formData.get("expectedQuantity")}` : "",
    formData.get("actualQuantity") ? `Actual: ${formData.get("actualQuantity")}` : "",
    formData.get("differenceQuantity") ? `Difference: ${formData.get("differenceQuantity")}` : "",
    formData.get("discrepancyReason") ? `Reason: ${formData.get("discrepancyReason")}` : "",
    formData.get("discrepancyPhoto") ? `Photo: ${formData.get("discrepancyPhoto")}` : "",
    formData.get("emptyReturnCondition") ? `Empty return condition: ${formData.get("emptyReturnCondition")}` : "",
    formData.get("podCustomerRemarks") ? `POD remarks: ${formData.get("podCustomerRemarks")}` : ""
  ].filter(Boolean);

  return truncate(parts.join(" | "), 500) || undefined;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(DEFAULT_CURRENCY_LOCALE, {
    style: "currency",
    currency: DEFAULT_CURRENCY,
    maximumFractionDigits: 0
  }).format(value);
}

function truncate(value: string, max: number) {
  return value.length > max ? value.slice(0, max) : value;
}
