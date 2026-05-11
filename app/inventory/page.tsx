import Link from "next/link";

export default function InventoryPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 5</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Inventory Control</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Manage cylinder records, opening balances, stock balance views, and
          inventory movement workflows for requests, approvals, dispatch,
          receiving, and variance logging.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-5">
        <InventoryCard href="/inventory/cylinders" title="Cylinder Records" description="Create, search, edit, and audit cylinder master records." />
        <InventoryCard href="/inventory/supplier-receipts" title="Supplier Receipts" description="Receive purchased cylinders into approved warehouses with serial and barcode control." />
        <InventoryCard href="/inventory/stock-balances" title="Stock Balances" description="View balances grouped by SKU, location, and status." />
        <InventoryCard href="/inventory/opening-balances/new" title="Opening Balance Entry" description="Manual import-style opening balance entry for initial cylinders." />
        <InventoryCard href="/inventory/movements" title="Inventory Movements" description="Request, approve, dispatch, receive, and audit stock movements." />
      </section>
    </div>
  );
}

function InventoryCard({
  href,
  title,
  description
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel hover:border-brand-200 hover:bg-brand-50" href={href}>
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </Link>
  );
}
