"use client";

import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_CURRENCY, DEFAULT_CURRENCY_LOCALE } from "@/lib/currency";
import { formatPaymentMethod, paymentMethods } from "@/lib/refill-sales";

type Option = { id: string; name: string; code?: string; phone?: string };

export function FullCylinderSaleForm({
  customers,
  locations,
  isAdmin
}: {
  customers: Option[];
  locations: Option[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [cylinderAmount, setCylinderAmount] = useState(2500);
  const [gasAmount, setGasAmount] = useState(1200);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/retail/full-cylinder-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: mode === "existing" ? formData.get("customerId") : undefined,
        customer: mode === "new" ? {
          name: formData.get("customerName"),
          phone: formData.get("phone"),
          proofReference: formData.get("proofReference"),
          category: formData.get("category"),
          address: formData.get("address"),
          status: "ACTIVE"
        } : undefined,
        locationId: formData.get("locationId") || undefined,
        cylinderCode: formData.get("cylinderCode"),
        paymentMethod: formData.get("paymentMethod"),
        paymentReference: formData.get("paymentReference") || undefined,
        cylinderAmount,
        gasAmount,
        notes: formData.get("notes") || undefined
      })
    });
    const result = (await response.json().catch(() => ({ error: "Unable to complete full cylinder sale." }))) as { sale?: { id: string }; error?: string };
    setIsSubmitting(false);
    if (!response.ok) {
      setError(result.error ?? "Unable to complete full cylinder sale.");
      return;
    }
    router.push("/retail-sales/full-cylinder-sales");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex gap-2">
          <button className={tabClass(mode === "new")} type="button" onClick={() => setMode("new")}>Register customer</button>
          <button className={tabClass(mode === "existing")} type="button" onClick={() => setMode("existing")}>Existing customer</button>
        </div>
      </div>

      {mode === "existing" ? (
        <label className="block text-sm font-medium text-slate-700">
          Customer
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="customerId" required>
            <option value="">Select customer...</option>
            {customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name} {customer.phone ? `- ${customer.phone}` : ""}</option>)}
          </select>
        </label>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Customer Name" name="customerName" required />
          <Input label="Phone" name="phone" required />
          <Input label="ID/Passport/Proof Ref" name="proofReference" required />
          <label className="block text-sm font-medium text-slate-700">
            Category
            <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="category" defaultValue="DOMESTIC">
              <option value="DOMESTIC">Domestic</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="INDUSTRIAL">Industrial</option>
            </select>
          </label>
          <div className="md:col-span-2"><Input label="Address" name="address" required /></div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {isAdmin ? (
          <label className="block text-sm font-medium text-slate-700">
            Selling Point
            <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="locationId" required>
              <option value="">Select selling point...</option>
              {locations.map((location) => <option value={location.id} key={location.id}>{location.code} - {location.name}</option>)}
            </select>
          </label>
        ) : null}
        <Input label="Scan full cylinder barcode / serial" name="cylinderCode" placeholder="Scan or type barcode" required />
        <label className="block text-sm font-medium text-slate-700">
          Payment Method
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="paymentMethod" defaultValue="CASH">
            {paymentMethods.map((method) => <option value={method} key={method}>{formatPaymentMethod(method)}</option>)}
          </select>
        </label>
        <Input label="Payment Reference" name="paymentReference" />
        <Input label="Cylinder amount" name="cylinderAmount" type="number" min="0" value={cylinderAmount} onChange={(event) => setCylinderAmount(Number(event.target.value))} />
        <Input label="Gas amount" name="gasAmount" type="number" min="0" value={gasAmount} onChange={(event) => setGasAmount(Number(event.target.value))} />
      </div>

      <section className="rounded-lg border border-brand-100 bg-brand-50 p-4">
        <p className="text-sm font-bold text-brand-950">Full cylinder plus gas total</p>
        <p className="mt-2 text-3xl font-bold text-brand-950">{formatMoney(cylinderAmount + gasAmount)}</p>
      </section>

      <label className="block text-sm font-medium text-slate-700">
        Notes
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="notes" />
      </label>
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Completing..." : "Complete full cylinder sale"}
      </button>
    </form>
  );
}

function Input({ label, name, ...props }: { label: string; name: string } & InputHTMLAttributes<HTMLInputElement>) {
  return <label className="block text-sm font-medium text-slate-700">{label}<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name={name} {...props} /></label>;
}

function tabClass(active: boolean) {
  return active ? "rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white" : "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700";
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(DEFAULT_CURRENCY_LOCALE, { style: "currency", currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(value);
}
