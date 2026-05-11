"use client";

import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export function PlantTransferActions({
  transferId,
  receivedLineIds,
  refilledCodes,
  status
}: {
  transferId: string;
  receivedLineIds: string[];
  refilledCodes: string[];
  status: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(action: string, payload: Record<string, unknown>) {
    setError("");
    setIsSubmitting(true);
    const response = await fetch(`/api/inventory/plant-transfers/${transferId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload })
    });
    const result = (await response.json().catch(() => ({ error: "Unable to update plant transfer." }))) as { error?: string };
    setIsSubmitting(false);
    if (!response.ok) {
      setError(result.error ?? "Unable to update plant transfer.");
      return;
    }
    router.refresh();
  }

  function receiveAtPlant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    submit("receive-at-plant", {
      receivedCodes: parseCodes(String(formData.get("receivedCodes") ?? "")),
      damagedCodes: parseCodes(String(formData.get("damagedCodes") ?? "")),
      extraCodes: parseCodes(String(formData.get("extraCodes") ?? ""))
    });
  }

  function createBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    submit("create-refill-batch", {
      reference: formData.get("reference"),
      transferLineIds: receivedLineIds,
      qualityInspectionStatus: formData.get("qualityInspectionStatus"),
      qualityNotes: formData.get("qualityNotes") || undefined
    });
  }

  function dispatchReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    submit("dispatch-return", {
      vehicle: formData.get("vehicle"),
      driver: formData.get("driver"),
      sealNumber: formData.get("sealNumber"),
      remarks: formData.get("remarks") || undefined
    });
  }

  function receiveReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    submit("receive-return", { receivedCodes: parseCodes(String(formData.get("receivedCodes") ?? "")) });
  }

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {status === "DISPATCHED_TO_PLANT" || status === "VARIANCE_LOGGED" ? (
        <ActionPanel title="Plant receipt by scan" onSubmit={receiveAtPlant}>
          <Textarea name="receivedCodes" label="Received cylinder codes" />
          <Textarea name="damagedCodes" label="Damaged cylinder codes" />
          <Textarea name="extraCodes" label="Extra cylinder codes" />
          <Submit disabled={isSubmitting}>Receive at plant</Submit>
        </ActionPanel>
      ) : null}

      {(status === "RECEIVED_AT_PLANT" || status === "VARIANCE_LOGGED") && receivedLineIds.length ? (
        <ActionPanel title="Refill batch and quality check" onSubmit={createBatch}>
          <Input name="reference" label="Batch Reference" placeholder="REFILL-BATCH-0001" required />
          <label className="block text-sm font-medium text-slate-700">
            Quality Inspection
            <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="qualityInspectionStatus" defaultValue="PASSED">
              <option value="PASSED">Passed</option>
              <option value="FAILED">Failed</option>
            </select>
          </label>
          <Textarea name="qualityNotes" label="Quality notes" />
          <Submit disabled={isSubmitting}>Mark filled</Submit>
        </ActionPanel>
      ) : null}

      {status === "REFILLED" ? (
        <ActionPanel title="Dispatch filled cylinders back to Wandiege" onSubmit={dispatchReturn}>
          <Input name="vehicle" label="Vehicle" required />
          <Input name="driver" label="Driver" required />
          <Input name="sealNumber" label="Seal Number" required />
          <Textarea name="remarks" label="Return remarks" />
          <Submit disabled={isSubmitting}>Dispatch return</Submit>
        </ActionPanel>
      ) : null}

      {status === "RETURN_DISPATCHED" ? (
        <ActionPanel title="Wandiege return receipt" onSubmit={receiveReturn}>
          <Textarea name="receivedCodes" label="Received filled cylinder codes" defaultValue={refilledCodes.join("\n")} />
          <Submit disabled={isSubmitting}>Receive filled cylinders</Submit>
        </ActionPanel>
      ) : null}
    </div>
  );
}

function ActionPanel({ title, onSubmit, children }: { title: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void; children: ReactNode }) {
  return <form className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4" onSubmit={onSubmit}><h3 className="font-semibold text-slate-950">{title}</h3>{children}</form>;
}

function Input({ label, name, ...props }: { label: string; name: string } & InputHTMLAttributes<HTMLInputElement>) {
  return <label className="block text-sm font-medium text-slate-700">{label}<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name={name} {...props} /></label>;
}

function Textarea({ label, name, defaultValue = "" }: { label: string; name: string; defaultValue?: string }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" name={name} defaultValue={defaultValue} /></label>;
}

function Submit({ disabled, children }: { disabled: boolean; children: ReactNode }) {
  return <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={disabled} type="submit">{disabled ? "Saving..." : children}</button>;
}

function parseCodes(value: string) {
  return value.split(/[\n,]+/).map((code) => code.trim()).filter(Boolean);
}
