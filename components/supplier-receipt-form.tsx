"use client";

import { useMemo, useState, type FormEvent, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Plus, Printer, Trash2 } from "lucide-react";
import {
  formatSupplierReceiptCondition,
  supplierReceiptConditions,
  supplierReceiptSizes,
  validateReceiptLineDuplicates,
  type SupplierReceiptLineValues
} from "@/lib/supplier-receipts";

type WarehouseOption = {
  id: string;
  code: string;
  name: string;
};

const emptyLine: SupplierReceiptLineValues = {
  cylinderSizeKg: 13,
  factorySerialNo: "",
  barcode: "",
  qrCode: "",
  manufacturer: "",
  manufactureDate: "",
  condition: "FILLED"
};

export function SupplierReceiptForm({
  warehouses,
  receivedByName
}: {
  warehouses: WarehouseOption[];
  receivedByName: string;
}) {
  const router = useRouter();
  const [lines, setLines] = useState<SupplierReceiptLineValues[]>([{ ...emptyLine }]);
  const [csvText, setCsvText] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const duplicateWarning = useMemo(() => validateReceiptLineDuplicates(lines), [lines]);

  function updateLine(index: number, patch: Partial<SupplierReceiptLineValues>) {
    setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
  }

  function importCsv() {
    const imported = csvText
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter(Boolean)
      .map(parseCsvRow)
      .filter(Boolean) as SupplierReceiptLineValues[];

    if (!imported.length) {
      setError("Paste CSV rows as size,factory serial,barcode,manufacturer,manufacture date,condition.");
      return;
    }

    setLines(imported);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const status = (submitter?.value || "DRAFT") as "DRAFT" | "REVIEWED" | "POSTED";

    if (duplicateWarning) {
      setError(duplicateWarning);
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const payload = {
      reference: formData.get("reference"),
      warehouseId: formData.get("warehouseId"),
      supplierManufacturer: formData.get("supplierManufacturer"),
      purchaseOrderReference: formData.get("purchaseOrderReference"),
      deliveryNote: formData.get("deliveryNote") || undefined,
      vehicleTruckNumber: formData.get("vehicleTruckNumber") || undefined,
      receiptDateTime: formData.get("receiptDateTime"),
      receivedByName: formData.get("receivedByName"),
      remarks: formData.get("remarks") || undefined,
      attachmentPlaceholder: formData.get("attachmentPlaceholder") || undefined,
      status,
      lines
    };

    const response = await fetch("/api/inventory/supplier-receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = (await response.json().catch(() => ({
      error: "Unable to save supplier receipt."
    }))) as { receipt?: { id: string }; error?: string };

    if (!response.ok) {
      setError(result.error ?? "Unable to save supplier receipt.");
      setIsSubmitting(false);
      return;
    }

    router.push(`/inventory/supplier-receipts/${result.receipt?.id}`);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput label="Receipt Reference" name="reference" placeholder="SUP-RCV-0001" required />
        <label className="block text-sm font-medium text-slate-700">
          Receiving Warehouse
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="warehouseId" required>
            <option value="">Select...</option>
            {warehouses.map((warehouse) => (
              <option value={warehouse.id} key={warehouse.id}>
                {warehouse.code} - {warehouse.name}
              </option>
            ))}
          </select>
        </label>
        <TextInput label="Supplier / Manufacturer" name="supplierManufacturer" placeholder="Lake Gas" required />
        <TextInput label="Purchase Order / Reference" name="purchaseOrderReference" placeholder="PO-0001" required />
        <TextInput label="Delivery Note" name="deliveryNote" placeholder="DN-0001" />
        <TextInput label="Vehicle / Truck Number" name="vehicleTruckNumber" placeholder="KDK 152E" />
        <TextInput label="Receipt Date / Time" name="receiptDateTime" type="datetime-local" defaultValue={defaultDateTime()} required />
        <TextInput label="Received By" name="receivedByName" defaultValue={receivedByName} required />
        <TextInput label="Attachment Placeholder" name="attachmentPlaceholder" placeholder="Delivery note / invoice file reference" />
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Remarks
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="remarks" />
      </label>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">Cylinder list</h2>
            <p className="text-sm text-slate-500">Manual entry or CSV rows: size, factory serial, barcode, manufacturer, manufacture date, condition.</p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
            onClick={() => setLines((current) => [...current, { ...emptyLine }])}
            type="button"
          >
            <Plus size={16} aria-hidden="true" />
            Add line
          </button>
        </div>

        <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto]">
          <label className="block text-sm font-medium text-slate-700">
            CSV line entry
            <textarea
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
              onChange={(event) => setCsvText(event.target.value)}
              placeholder="6,WG-FSN-001,WGBC-001,Wells Gas,2026-05-11,FILLED"
              value={csvText}
            />
          </label>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"
            onClick={importCsv}
            type="button"
          >
            <FileUp size={16} aria-hidden="true" />
            Import CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">Size</th>
                <th className="px-3 py-3">Factory Serial</th>
                <th className="px-3 py-3">Barcode / QR</th>
                <th className="px-3 py-3">Manufacturer</th>
                <th className="px-3 py-3">Manufacture Date</th>
                <th className="px-3 py-3">Condition</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line, index) => (
                <tr key={index}>
                  <td className="px-3 py-3">
                    <select
                      className="w-24 rounded-lg border border-slate-300 px-2 py-2 text-sm"
                      onChange={(event) => updateLine(index, { cylinderSizeKg: Number(event.target.value) })}
                      value={line.cylinderSizeKg}
                    >
                      {supplierReceiptSizes.map((size) => <option value={size} key={size}>{size}kg</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <input className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" onChange={(event) => updateLine(index, { factorySerialNo: event.target.value })} value={line.factorySerialNo} />
                  </td>
                  <td className="px-3 py-3">
                    <input className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" onChange={(event) => updateLine(index, { barcode: event.target.value })} value={line.barcode} />
                  </td>
                  <td className="px-3 py-3">
                    <input className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" onChange={(event) => updateLine(index, { manufacturer: event.target.value })} value={line.manufacturer} />
                  </td>
                  <td className="px-3 py-3">
                    <input className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" type="date" onChange={(event) => updateLine(index, { manufactureDate: event.target.value })} value={line.manufactureDate ?? ""} />
                  </td>
                  <td className="px-3 py-3">
                    <select
                      className="w-36 rounded-lg border border-slate-300 px-2 py-2 text-sm"
                      onChange={(event) => updateLine(index, { condition: event.target.value as SupplierReceiptLineValues["condition"] })}
                      value={line.condition}
                    >
                      {supplierReceiptConditions.map((condition) => <option value={condition} key={condition}>{formatSupplierReceiptCondition(condition)}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      aria-label="Remove line"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600"
                      disabled={lines.length === 1}
                      onClick={() => removeLine(index)}
                      type="button"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {duplicateWarning || error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error || duplicateWarning}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <SubmitButton disabled={isSubmitting} label="Save draft" value="DRAFT" />
        <SubmitButton disabled={isSubmitting} label="Save reviewed" value="REVIEWED" />
        <SubmitButton disabled={isSubmitting} label="Post receipt" value="POSTED" primary />
        <button className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => window.print()} type="button">
          <Printer size={16} aria-hidden="true" />
          Print list
        </button>
      </div>
    </form>
  );
}

function TextInput({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name={name} {...props} />
    </label>
  );
}

function SubmitButton({
  disabled,
  label,
  value,
  primary = false
}: {
  disabled: boolean;
  label: string;
  value: string;
  primary?: boolean;
}) {
  return (
    <button
      className={primary ? "rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" : "rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"}
      disabled={disabled}
      name="status"
      type="submit"
      value={value}
    >
      {disabled ? "Saving..." : label}
    </button>
  );
}

function parseCsvRow(row: string) {
  const [size, factorySerialNo, barcode, manufacturer, manufactureDate, condition] = row.split(",").map((part) => part.trim());
  const parsedCondition = supplierReceiptConditions.find((item) => item === condition?.toUpperCase()) ?? "FILLED";

  if (!size || !factorySerialNo || !barcode || !manufacturer) return null;

  return {
    cylinderSizeKg: Number(size),
    factorySerialNo,
    barcode,
    qrCode: "",
    manufacturer,
    manufactureDate: manufactureDate || "",
    condition: parsedCondition
  };
}

function defaultDateTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}
