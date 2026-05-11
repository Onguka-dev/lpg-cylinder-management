"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Barcode, Camera, CheckCircle2, Keyboard, Trash2, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatCylinderStatus } from "@/lib/inventory";
import type { ScannerValidationResponse } from "@/lib/scanning";

type ScanAction =
  | "RECEIPT"
  | "TRANSFER_DISPATCH"
  | "TRANSFER_RECEIVE"
  | "SALE"
  | "CUSTOMER_RETURN"
  | "NON_CODED_INTAKE"
  | "REPORT_LOOKUP"
  | "MOBILE_VERIFY";

type CylinderStatusValue =
  | "FILLED"
  | "EMPTY"
  | "DAMAGED"
  | "IN_TRANSIT"
  | "RESERVED"
  | "UNDER_MAINTENANCE"
  | "WITH_CUSTOMER"
  | "QUARANTINED"
  | "SCRAPPED_WRITTEN_OFF"
  | "LOST_OVERDUE";

type BatchScanPanelProps = {
  action: ScanAction;
  expectedSourceLocationId?: string | null;
  expectedStatus?: CylinderStatusValue | null;
  batchId?: string;
  allowDuplicateInBatch?: boolean;
  title?: string;
};

type BatchItem = {
  code: string;
  result: ScannerValidationResponse;
};

export function BatchScanPanel({
  action,
  expectedSourceLocationId,
  expectedStatus,
  batchId,
  allowDuplicateInBatch = false,
  title = "Cylinder scanning"
}: BatchScanPanelProps) {
  const [stableBatchId] = useState(() => batchId ?? crypto.randomUUID());
  const [items, setItems] = useState<BatchItem[]>([]);
  const [lastResult, setLastResult] = useState<ScannerValidationResponse | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [feedback, setFeedback] = useState<"idle" | "success" | "error">("idle");
  const scannedCodes = useMemo(() => items.map((item) => item.code), [items]);

  async function validateScan(code: string) {
    setIsScanning(true);
    setFeedback("idle");

    const response = await fetch("/api/scans/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barcode: code,
        action,
        expectedSourceLocationId,
        expectedStatus,
        batchId: stableBatchId,
        batchBarcodeValues: scannedCodes,
        allowDuplicateInBatch
      })
    });
    const result = (await response.json().catch(() => ({
      ok: false,
      result: "FAILED",
      message: "Scan could not be validated."
    }))) as ScannerValidationResponse;

    setLastResult(result);
    setFeedback(result.ok ? "success" : "error");
    setIsScanning(false);

    if (result.ok || allowDuplicateInBatch) {
      setItems((current) => [{ code: code.trim(), result }, ...current]);
    }
  }

  function removeItem(code: string) {
    setItems((current) => current.filter((item) => item.code !== code));
  }

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-950">{title}</h2>
          <p className="text-sm text-slate-500">{items.length} cylinders in this batch</p>
        </div>
        <ScanResultBadge result={lastResult?.result} />
      </div>

      <BarcodeScanInput disabled={isScanning} feedback={feedback} onScan={validateScan} />
      <ManualEntryFallback disabled={isScanning} onSubmit={validateScan} />
      <LastScannedCylinderCard result={lastResult} />

      <div className="rounded-lg border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
          <p className="text-sm font-semibold text-slate-800">Batch list</p>
          <StatusBadge tone="neutral">{items.length}</StatusBadge>
        </div>
        {items.length ? (
          <ul className="divide-y divide-slate-200">
            {items.map((item) => (
              <li className="flex items-center justify-between gap-3 px-3 py-3" key={`${item.code}-${item.result.cylinder?.id ?? item.result.result}`}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {item.result.cylinder?.serialNumber ?? item.code}
                  </p>
                  <p className="truncate text-xs text-slate-500">{item.result.message}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <ScanResultBadge result={item.result.result} />
                  <button
                    aria-label={`Remove ${item.code} from batch`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
                    onClick={() => removeItem(item.code)}
                    type="button"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 py-4 text-sm text-slate-500">Validated cylinders will appear here.</p>
        )}
      </div>
    </section>
  );
}

export function BarcodeScanInput({
  disabled,
  feedback,
  onScan
}: {
  disabled?: boolean;
  feedback?: "idle" | "success" | "error";
  onScan: (code: string) => void | Promise<void>;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = value.trim();
    if (!code) return;
    await onScan(code);
    setValue("");
    inputRef.current?.focus();
  }

  return (
    <form className="space-y-2" onSubmit={handleSubmit}>
      <label className="block text-sm font-semibold text-slate-800" htmlFor="barcode-scan-input">
        Barcode / QR scan
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Barcode className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={22} aria-hidden="true" />
          <input
            ref={inputRef}
            autoCapitalize="characters"
            autoComplete="off"
            className="min-h-14 w-full rounded-lg border border-slate-300 pl-12 pr-4 text-lg font-semibold tracking-normal text-slate-950 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100"
            disabled={disabled}
            id="barcode-scan-input"
            inputMode="text"
            onChange={(event) => setValue(event.target.value)}
            placeholder="Scan or type code"
            value={value}
          />
        </div>
        <button
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          type="submit"
        >
          <Keyboard size={18} aria-hidden="true" />
          Validate
        </button>
        <button
          aria-label="Camera scan placeholder"
          className="inline-flex min-h-14 items-center justify-center rounded-lg border border-slate-300 px-4 text-slate-500 disabled:opacity-60"
          disabled
          type="button"
          title="Camera scan placeholder"
        >
          <Camera size={20} aria-hidden="true" />
        </button>
      </div>
      <div aria-live="polite" className="min-h-5 text-sm">
        {feedback === "success" ? <span className="font-semibold text-success-700">Accepted</span> : null}
        {feedback === "error" ? <span className="font-semibold text-danger-700">Needs attention</span> : null}
      </div>
    </form>
  );
}

export function ManualEntryFallback({
  disabled,
  onSubmit
}: {
  disabled?: boolean;
  onSubmit: (code: string) => void | Promise<void>;
}) {
  const [manualCode, setManualCode] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    await onSubmit(code);
    setManualCode("");
  }

  return (
    <form className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 sm:flex-row" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="manual-scan-code">
        Manual barcode entry
      </label>
      <input
        className="min-h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm disabled:bg-slate-100"
        disabled={disabled}
        id="manual-scan-code"
        onChange={(event) => setManualCode(event.target.value)}
        placeholder="Manual barcode entry"
        value={manualCode}
      />
      <button
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        type="submit"
      >
        Add manually
      </button>
    </form>
  );
}

export function LastScannedCylinderCard({ result }: { result: ScannerValidationResponse | null }) {
  if (!result) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        Last scanned cylinder will appear here.
      </div>
    );
  }

  const isSuccess = result.ok;
  const Icon = isSuccess ? CheckCircle2 : XCircle;

  return (
    <div className={isSuccess ? "rounded-lg border border-success-100 bg-success-50 p-4" : "rounded-lg border border-danger-100 bg-danger-50 p-4"}>
      <div className="flex items-start gap-3">
        <Icon className={isSuccess ? "mt-0.5 text-success-700" : "mt-0.5 text-danger-700"} size={20} aria-hidden="true" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className={isSuccess ? "font-bold text-success-900" : "font-bold text-danger-800"}>
              {result.cylinder?.serialNumber ?? result.result.replaceAll("_", " ")}
            </p>
            <ScanResultBadge result={result.result} />
          </div>
          <p className={isSuccess ? "mt-1 text-sm text-success-800" : "mt-1 text-sm text-danger-700"}>{result.message}</p>
          {result.cylinder ? (
            <p className="mt-2 text-sm text-slate-600">
              {result.cylinder.skuName} - {formatCylinderStatus(result.cylinder.status)} - {result.cylinder.locationName}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ScanResultBadge({ result }: { result?: string }) {
  if (!result) return <StatusBadge tone="neutral">Waiting</StatusBadge>;
  if (result === "PERMITTED") return <StatusBadge tone="success">Permitted</StatusBadge>;
  if (result === "ALREADY_SCANNED") return <StatusBadge tone="warning">Already scanned</StatusBadge>;
  return <StatusBadge tone="danger">{result.toLowerCase().replaceAll("_", " ")}</StatusBadge>;
}
