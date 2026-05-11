"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
      onClick={() => window.print()}
      type="button"
    >
      <Printer size={16} aria-hidden="true" />
      {label}
    </button>
  );
}
