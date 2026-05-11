"use client";

import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";

export function PlantTransferForm() {
  const router = useRouter();
  const [codes, setCodes] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const payload = {
      reference: formData.get("reference"),
      vehicle: formData.get("vehicle"),
      driver: formData.get("driver"),
      sealNumber: formData.get("sealNumber"),
      dispatchNote: formData.get("dispatchNote") || undefined,
      expectedReceiptTime: formData.get("expectedReceiptTime") || undefined,
      remarks: formData.get("remarks") || undefined,
      cylinderCodes: parseCodes(codes)
    };
    const response = await fetch("/api/inventory/plant-transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = (await response.json().catch(() => ({ error: "Unable to dispatch plant transfer." }))) as { transfer?: { id: string }; error?: string };
    if (!response.ok) {
      setError(result.error ?? "Unable to dispatch plant transfer.");
      setIsSubmitting(false);
      return;
    }
    router.push(`/inventory/plant-transfers/${result.transfer?.id}`);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Reference" name="reference" placeholder="PLANT-TRF-0001" required />
        <Input label="Vehicle" name="vehicle" placeholder="KDK 152E" required />
        <Input label="Driver" name="driver" placeholder="Driver name or staff code" required />
        <Input label="Seal Number" name="sealNumber" placeholder="SEAL-0001" required />
        <Input label="Dispatch Note" name="dispatchNote" placeholder="DN-0001" />
        <Input label="Expected Receipt Time" name="expectedReceiptTime" type="datetime-local" />
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Scan / import empty cylinder list
        <textarea
          className="mt-1 min-h-40 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
          onChange={(event) => setCodes(event.target.value)}
          placeholder="One serial/barcode per line, or comma-separated"
          required
          value={codes}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Remarks
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="remarks" />
      </label>
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Dispatching..." : "Dispatch empty cylinders to plant"}
      </button>
    </form>
  );
}

function Input({ label, name, ...props }: { label: string; name: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name={name} {...props} />
    </label>
  );
}

function parseCodes(value: string) {
  return value.split(/[\n,]+/).map((code) => code.trim()).filter(Boolean);
}
