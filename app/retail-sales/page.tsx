import Link from "next/link";

export default function RetailSalesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 6</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Retail Sales</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          RSO walk-in refill sales are active. Delivery, credit, and advanced
          promotions remain placeholders for later stages.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white" href="/retail-sales/refills/new">
            New refill
          </Link>
          <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href="/retail-sales/refills">
            View refills
          </Link>
        </div>
      </section>
    </div>
  );
}
