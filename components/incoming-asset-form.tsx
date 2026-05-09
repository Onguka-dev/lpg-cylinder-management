"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { Barcode, Plus, Trash2, UploadCloud } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

type Option = {
  id: string;
  code: string;
  name: string;
  type?: string;
};

type IncomingTab = "plant" | "market" | "sap";

type IncomingLine = {
  id: string;
  serial: string;
  description: string;
  skuId: string;
  condition: string;
  quantity: number;
};

const tabs: Array<{ key: IncomingTab; label: string; sourceType: string }> = [
  { key: "plant", label: "Incoming from Plant", sourceType: "Plant" },
  { key: "market", label: "Incoming from Market", sourceType: "Market return" },
  { key: "sap", label: "Incoming from SAP / System Import", sourceType: "SAP import placeholder" }
];

const inspectionStatusToCylinderStatus: Record<string, string> = {
  PASSED: "FILLED",
  PENDING: "FILLED",
  FAILED: "DAMAGED",
  REJECTED: "DAMAGED",
  UNSAFE: "UNDER_MAINTENANCE"
};

export function IncomingAssetForm({
  skus,
  locations,
  defaultWarehouseId
}: {
  skus: Option[];
  locations: Option[];
  defaultWarehouseId?: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<IncomingTab>("plant");
  const [lines, setLines] = useState<IncomingLine[]>([
    {
      id: crypto.randomUUID(),
      serial: "",
      description: "LPG cylinder",
      skuId: skus[0]?.id ?? "",
      condition: "Good",
      quantity: 1
    }
  ]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeSource = useMemo(() => tabs.find((tab) => tab.key === activeTab) ?? tabs[0], [activeTab]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const destinationLocationId = String(form.get("destinationLocationId") ?? "");
    const deliveryNote = String(form.get("deliveryNote") ?? "").trim();
    const inspectionStatus = String(form.get("inspectionStatus") ?? "PENDING");
    const destinationStatus = inspectionStatusToCylinderStatus[inspectionStatus] ?? "FILLED";
    const referenceBase = deliveryNote || `ZONA-${Date.now()}`;
    const validLines = lines.filter((line) => line.skuId && Number(line.quantity) > 0);

    if (!destinationLocationId) {
      setError("Select the receiving warehouse or quarantine location.");
      setIsSubmitting(false);
      return;
    }

    if (!validLines.length) {
      setError("Add at least one valid asset line item with SKU and quantity.");
      setIsSubmitting(false);
      return;
    }

    try {
      let firstMovementId = "";

      for (let index = 0; index < validLines.length; index += 1) {
        const line = validLines[index];
        const response = await fetch("/api/inventory/movements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference: `${referenceBase}-${String(index + 1).padStart(2, "0")}`,
            type: "RECEIPT",
            skuId: line.skuId,
            destinationLocationId,
            destinationStatus,
            requestedQuantity: line.quantity,
            notes: buildNotes(form, activeSource.sourceType, line, inspectionStatus)
          })
        });
        const result = (await response.json().catch(() => ({ error: "Unable to create incoming receipt movement." }))) as {
          movement?: { id: string };
          error?: string;
        };

        if (!response.ok || !result.movement?.id) {
          throw new Error(result.error ?? "Unable to create incoming receipt movement.");
        }

        firstMovementId ||= result.movement.id;
      }

      router.push(firstMovementId ? `/inventory/movements/${firstMovementId}` : "/inventory/movements");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create incoming receipt movement.");
      setIsSubmitting(false);
    }
  }

  function updateLine(id: string, patch: Partial<IncomingLine>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        serial: "",
        description: "LPG cylinder",
        skuId: skus[0]?.id ?? "",
        condition: "Good",
        quantity: 1
      }
    ]);
  }

  function removeLine(id: string) {
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.id !== id)));
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3" role="tablist" aria-label="Incoming source type">
        {tabs.map((tab) => (
          <button
            aria-selected={activeTab === tab.key}
            className={
              activeTab === tab.key
                ? "rounded-brand bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
                : "rounded-brand border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200"
            }
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "sap" ? (
        <div className="rounded-brand border border-dashed border-info-200 bg-info-50 px-4 py-3 text-sm text-info-800">
          SAP/system import is a controlled placeholder. Submitting still creates standard receipt movements for review.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <ReadOnlyField label="Source type" value={activeSource.sourceType} />
        <TextInput label="Plant / supplier / retail point" name="sourceName" placeholder="Plant A or Retail Outlet 04" required />
        <TextInput label="Delivery note or GRN number" name="deliveryNote" placeholder="GRN-2026-001" required />
        <TextInput label="Vehicle number" name="vehicleNumber" placeholder="KDA 123A" />
        <TextInput label="Driver name" name="driverName" placeholder="Driver name" />
        <TextInput label="Seal number" name="sealNumber" placeholder="Seal number" />
        <TextInput label="Receipt date/time" name="receiptDateTime" type="datetime-local" required />
        <SelectInput label="Receiving warehouse / location" name="destinationLocationId" defaultValue={defaultWarehouseId ?? ""} options={locations} required />
        <TextInput label="Asset category" name="assetCategory" placeholder="Cylinder" />
        <TextInput label="Asset type / model" name="assetModel" placeholder="LPG cylinder model" />
        <TextInput label="Batch number" name="batchNumber" placeholder="Batch number" />
        <TextInput label="PO / reference number" name="poReference" placeholder="PO/reference" />
        <SelectInput
          label="Condition"
          name="condition"
          defaultValue="GOOD"
          options={[
            { id: "GOOD", code: "GOOD", name: "Good" },
            { id: "DAMAGED", code: "DAMAGED", name: "Damaged" },
            { id: "UNSAFE", code: "UNSAFE", name: "Unsafe" }
          ]}
        />
        <SelectInput
          label="Quality inspection status"
          name="inspectionStatus"
          defaultValue="PENDING"
          options={[
            { id: "PENDING", code: "PENDING", name: "Pending inspection" },
            { id: "PASSED", code: "PASSED", name: "Passed" },
            { id: "FAILED", code: "FAILED", name: "Failed" },
            { id: "REJECTED", code: "REJECTED", name: "Rejected" },
            { id: "UNSAFE", code: "UNSAFE", name: "Unsafe / maintenance review" }
          ]}
        />
        <TextInput label="Inspector" name="inspector" placeholder="Inspector name" />
      </div>

      <label className="block text-sm font-semibold text-slate-700">
        Remarks
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="remarks" placeholder="Receipt remarks, inspection notes, or variance context." />
      </label>

      <div className="rounded-brand border border-dashed border-slate-300 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-950">Upload documents placeholder</p>
            <p className="mt-1 text-sm text-slate-500">Attach delivery notes, GRNs, photos or import files when document storage is connected.</p>
          </div>
          <button className="inline-flex items-center justify-center gap-2 rounded-brand border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700" type="button">
            <UploadCloud size={16} aria-hidden="true" />
            Upload later
          </button>
        </div>
      </div>

      <section className="rounded-brand border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">Asset line items</h2>
            <p className="mt-1 text-sm text-slate-500">Each row creates a standard receipt movement using the existing inventory workflow.</p>
          </div>
          <button className="inline-flex items-center justify-center gap-2 rounded-brand bg-brand-600 px-4 py-2 text-sm font-semibold text-white" onClick={addLine} type="button">
            <Plus size={16} aria-hidden="true" />
            Add item
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Serial / barcode</th>
                <th className="px-4 py-3">Description / category</th>
                <th className="px-4 py-3">Model / size</th>
                <th className="px-4 py-3">Condition</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-3">
                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2" onChange={(event) => updateLine(line.id, { serial: event.target.value })} placeholder="Scan or type serial" value={line.serial} />
                  </td>
                  <td className="px-4 py-3">
                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2" onChange={(event) => updateLine(line.id, { description: event.target.value })} value={line.description} />
                  </td>
                  <td className="px-4 py-3">
                    <select className="w-full rounded-lg border border-slate-300 px-3 py-2" onChange={(event) => updateLine(line.id, { skuId: event.target.value })} value={line.skuId}>
                      <option value="">Select SKU</option>
                      {skus.map((sku) => (
                        <option value={sku.id} key={sku.id}>{sku.code} - {sku.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select className="w-full rounded-lg border border-slate-300 px-3 py-2" onChange={(event) => updateLine(line.id, { condition: event.target.value })} value={line.condition}>
                      <option>Good</option>
                      <option>Damaged</option>
                      <option>Unsafe</option>
                      <option>Rejected</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input className="w-28 rounded-lg border border-slate-300 px-3 py-2" min="1" onChange={(event) => updateLine(line.id, { quantity: Number(event.target.value) })} type="number" value={line.quantity} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-700" title="Scan barcode placeholder" type="button">
                        <Barcode size={16} aria-hidden="true" />
                      </button>
                      <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-danger-700 disabled:opacity-40" disabled={lines.length === 1} onClick={() => removeLine(line.id)} title="Remove item" type="button">
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-brand border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="info">Creates receipt movement</StatusBadge>
          <StatusBadge tone="warning">Unsafe items route to damaged or maintenance status</StatusBadge>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-brand border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => router.back()} type="button">
            Cancel
          </button>
          <button className="rounded-brand bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Creating receipt..." : "Submit to movement workflow"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-brand border border-danger-200 bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function buildNotes(form: FormData, sourceType: string, line: IncomingLine, inspectionStatus: string) {
  const fields = [
    `Zone A incoming receipt`,
    `Source type: ${sourceType}`,
    `Source: ${form.get("sourceName") || "Not provided"}`,
    `Vehicle: ${form.get("vehicleNumber") || "Not provided"}`,
    `Driver: ${form.get("driverName") || "Not provided"}`,
    `Seal: ${form.get("sealNumber") || "Not provided"}`,
    `Receipt date/time: ${form.get("receiptDateTime") || "Not provided"}`,
    `Batch: ${form.get("batchNumber") || "Not provided"}`,
    `PO/reference: ${form.get("poReference") || "Not provided"}`,
    `Line serial/barcode: ${line.serial || "Bulk line"}`,
    `Line condition: ${line.condition}`,
    `Inspection: ${inspectionStatus}`,
    `Inspector: ${form.get("inspector") || "Not provided"}`,
    `Remarks: ${form.get("remarks") || "None"}`
  ];

  return fields.join(" | ");
}

function TextInput({
  label,
  name,
  placeholder,
  type = "text",
  required = false
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name={name} placeholder={placeholder} required={required} type={type} />
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600" readOnly value={value} />
    </label>
  );
}

function SelectInput({
  label,
  name,
  options,
  defaultValue = "",
  required = false
}: {
  label: string;
  name: string;
  options: Option[];
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" defaultValue={defaultValue} name={name} required={required}>
        <option value="">Select...</option>
        {options.map((option) => (
          <option value={option.id} key={option.id}>
            {option.code} - {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}
