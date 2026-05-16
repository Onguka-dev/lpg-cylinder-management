"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { emptyReturnConditions, parseConditionLabel } from "@/lib/reverse-logistics";

type CustomerOption = { id: string; name: string; phone: string };
type LocationOption = { id: string; code: string; name: string };

export function EmptyReturnForm({ customers, locations, isAdmin }: { customers: CustomerOption[]; locations: LocationOption[]; isAdmin: boolean }) {
  const router = useRouter();
  const [noCode, setNoCode] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/retail/empty-returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: formData.get("customerId") || undefined,
        customerPhone: formData.get("customerPhone") || undefined,
        locationId: formData.get("locationId") || undefined,
        cylinderCode: noCode ? undefined : formData.get("cylinderCode"),
        noCode,
        serialNumber: noCode ? formData.get("serialNumber") : undefined,
        cylinderSizeKg: noCode ? formData.get("cylinderSizeKg") : undefined,
        condition: formData.get("condition"),
        remarks: formData.get("remarks") || undefined
      })
    });
    const result = (await response.json().catch(() => ({ error: "Unable to record empty return." }))) as { error?: string };
    setIsSubmitting(false);
    if (!response.ok) {
      setError(result.error ?? "Unable to record empty return.");
      return;
    }
    router.push("/inventory/empty-return-transfers");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Customer
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="customerId">
            <option value="">Search by phone below...</option>
            {customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name} - {customer.phone}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Customer Phone
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="customerPhone" />
        </label>
        {isAdmin ? (
          <label className="block text-sm font-medium text-slate-700">
            Selling Point
            <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="locationId">
              <option value="">Select location...</option>
              {locations.map((location) => <option value={location.id} key={location.id}>{location.code} - {location.name}</option>)}
            </select>
          </label>
        ) : null}
        <label className="block text-sm font-medium text-slate-700">
          Return Condition
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="condition" defaultValue="GOOD">
            {emptyReturnConditions.map((condition) => <option value={condition} key={condition}>{parseConditionLabel(condition)}</option>)}
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input className="h-4 w-4 rounded border-slate-300" checked={noCode} onChange={(event) => setNoCode(event.target.checked)} type="checkbox" />
        Returned empty has no QR/barcode
      </label>

      {noCode ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">Serial Number<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="serialNumber" required /></label>
          <label className="block text-sm font-medium text-slate-700">
            Size
            <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="cylinderSizeKg" required defaultValue="">
              <option value="">Select size...</option>
              <option value="6">6kg</option>
              <option value="13">13kg</option>
              <option value="50">50kg</option>
            </select>
          </label>
        </div>
      ) : (
        <label className="block text-sm font-medium text-slate-700">
          Returned Empty Scan
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" name="cylinderCode" placeholder="Scan barcode or serial" required />
        </label>
      )}

      <label className="block text-sm font-medium text-slate-700">
        Remarks
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="remarks" />
      </label>
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Recording..." : "Record empty return"}
      </button>
    </form>
  );
}
