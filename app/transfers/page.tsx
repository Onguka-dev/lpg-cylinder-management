import Link from "next/link";

export default function TransfersPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 5</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Transfers</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Transfer requests, approvals, dispatch confirmation, receiving
          confirmation, and variance logging are handled in the inventory
          movement workspace.
        </p>
        <div className="mt-5">
          <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white" href="/inventory/movements">
            Open Inventory Movements
          </Link>
        </div>
      </section>
    </div>
  );
}
