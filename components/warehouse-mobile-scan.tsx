"use client";

import { useMemo, useState } from "react";
import { Barcode, CheckCircle2, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

type ScanAsset = {
  serialNumber: string;
  barcode?: string | null;
  skuName: string;
  status: string;
  locationName: string;
};

export function WarehouseMobileScan({ assets }: { assets: ScanAsset[] }) {
  const [query, setQuery] = useState("");
  const [lastScan, setLastScan] = useState<ScanAsset | null>(null);
  const [wasInvalid, setWasInvalid] = useState(false);
  const assetMap = useMemo(() => {
    const map = new Map<string, ScanAsset>();
    assets.forEach((asset) => {
      map.set(asset.serialNumber.toLowerCase(), asset);
      if (asset.barcode) map.set(asset.barcode.toLowerCase(), asset);
    });
    return map;
  }, [assets]);

  function verify() {
    const key = query.trim().toLowerCase();
    const asset = assetMap.get(key) ?? null;
    setLastScan(asset);
    setWasInvalid(!asset);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-panel">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <Barcode size={22} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-950">Scan barcode / QR</h2>
            <p className="text-sm text-slate-500">Manual entry fallback uses current cylinder records.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            className="min-h-12 flex-1 rounded-2xl border border-slate-300 px-4 text-sm"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Scan or type barcode / serial"
            value={query}
          />
          <button className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-bold text-white" onClick={verify} type="button">
            Verify
          </button>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-panel">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-950">Last scanned asset</h2>
          {lastScan ? <StatusBadge tone="success">Valid</StatusBadge> : wasInvalid ? <StatusBadge tone="danger">Invalid</StatusBadge> : <StatusBadge tone="neutral">Waiting</StatusBadge>}
        </div>
        {lastScan ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 text-success-700" size={20} aria-hidden="true" />
              <div>
                <p className="font-bold text-slate-950">{lastScan.serialNumber}</p>
                <p className="mt-1 text-sm text-slate-500">{lastScan.skuName} · {lastScan.status} · {lastScan.locationName}</p>
              </div>
            </div>
          </div>
        ) : wasInvalid ? (
          <div className="mt-4 rounded-2xl bg-danger-50 p-4">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 text-danger-700" size={20} aria-hidden="true" />
              <div>
                <p className="font-bold text-danger-700">No matching asset found</p>
                <p className="mt-1 text-sm text-danger-700">Confirm the code or register the asset through the existing asset workflow.</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Scan result will appear here.</p>
        )}
      </section>
    </div>
  );
}
