"use client";

import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";

type LocationOption = { id: string; code: string; name: string };

export function EmptyReturnTransferForm({
  sources,
  warehouses,
  isAdmin
}: {
  sources: LocationOption[];
  warehouses: LocationOption[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [codes, setCodes] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/inventory/empty-return-transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference: formData.get("reference"),
        sourceLocationId: formData.get("sourceLocationId") || undefined,
        destinationLocationId: formData.get("destinationLocationId"),
        vehicle: formData.get("vehicle"),
        driverSalesRep: formData.get("driverSalesRep"),
        route: formData.get("route"),
        dispatchOfficerName: formData.get("dispatchOfficerName"),
        receivingOfficerName: formData.get("receivingOfficerName"),
        transferDateTime: formData.get("transferDateTime"),
        expectedReceiptAt: formData.get("expectedReceiptAt") || undefined,
        remarks: formData.get("remarks") || undefined,
        cylinderCodes: parseCodes(codes)
      })
    });
    const result = (await response.json().catch(() => ({ error: "Unable to dispatch empty returns." }))) as { movements?: Array<{ id: string }>; error?: string };
    setIsSubmitting(false);
    if (!response.ok) {
      setError(result.error ?? "Unable to dispatch empty returns.");
      return;
    }
    router.push(result.movements?.[0]?.id ? `/inventory/empty-return-transfers/${result.movements[0].id}` : "/inventory/empty-return-transfers");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Transfer Number" name="reference" placeholder="ERT-0001" required />
        {isAdmin ? (
          <label className="block text-sm font-medium text-slate-700">
            Source Selling Point
            <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="sourceLocationId" required>
              <option value="">Select source...</option>
              {sources.map((source) => <option value={source.id} key={source.id}>{source.code} - {source.name}</option>)}
            </select>
          </label>
        ) : null}
        <label className="block text-sm font-medium text-slate-700">
          Destination Warehouse
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="destinationLocationId" required defaultValue="">
            <option value="">Select warehouse...</option>
            {warehouses.map((warehouse) => <option value={warehouse.id} key={warehouse.id}>{warehouse.code} - {warehouse.name}</option>)}
          </select>
        </label>
        <Input label="Vehicle" name="vehicle" required />
        <Input label="Driver / Sales Rep" name="driverSalesRep" required />
        <Input label="Route" name="route" required />
        <Input label="Dispatch Officer" name="dispatchOfficerName" required />
        <Input label="Receiving Officer" name="receivingOfficerName" required />
        <Input label="Date / Time" name="transferDateTime" type="datetime-local" required />
        <Input label="Expected Receipt" name="expectedReceiptAt" type="datetime-local" />
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Empty cylinder scan list
        <textarea className="mt-1 min-h-40 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" onChange={(event) => setCodes(event.target.value)} placeholder="One barcode or serial per line" required value={codes} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Remarks
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="remarks" />
      </label>
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Dispatching..." : "Dispatch empties to warehouse"}
      </button>
    </form>
  );
}

function Input({ label, name, ...props }: { label: string; name: string } & InputHTMLAttributes<HTMLInputElement>) {
  return <label className="block text-sm font-medium text-slate-700">{label}<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name={name} {...props} /></label>;
}

function parseCodes(value: string) {
  return value.split(/[\n,]+/).map((code) => code.trim()).filter(Boolean);
}
