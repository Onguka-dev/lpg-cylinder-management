import { formatCylinderStatus } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export default async function StockBalancesPage() {
  const grouped = await prisma.cylinder.groupBy({
    by: ["skuId", "currentLocationId", "status"],
    _count: { id: true },
    orderBy: [{ skuId: "asc" }, { currentLocationId: "asc" }, { status: "asc" }]
  });
  const [skus, locations, thresholds] = await Promise.all([
    prisma.masterDataRecord.findMany({ where: { id: { in: grouped.map((row) => row.skuId) } } }),
    prisma.masterDataRecord.findMany({ where: { id: { in: grouped.map((row) => row.currentLocationId) } } }),
    prisma.masterDataRecord.findMany({ where: { type: "STOCK_THRESHOLD", isActive: true } })
  ]);
  const damagedCount = grouped
    .filter((row) => row.status === "DAMAGED")
    .reduce((sum, row) => sum + row._count.id, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Inventory</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Stock Balances</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Balances grouped by SKU, location, and cylinder status. Alert logic is
          placeholder-only in Stage 4.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <AlertCard title="Low Stock" value={`${thresholds.length} thresholds`} description="Placeholder for comparing balances against stock threshold master data." />
        <AlertCard title="Overstock" value="Placeholder" description="Future alert for locations above configured maximums." />
        <AlertCard title="Excess Damaged Cylinders" value={`${damagedCount} damaged`} description="Placeholder alert for damaged cylinder volume review." />
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">SKU/Size</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grouped.map((row) => (
                <tr key={`${row.skuId}-${row.currentLocationId}-${row.status}`}>
                  <td className="px-4 py-3 font-medium text-slate-900">{skus.find((sku) => sku.id === row.skuId)?.name ?? "Unknown SKU"}</td>
                  <td className="px-4 py-3 text-slate-700">{locations.find((location) => location.id === row.currentLocationId)?.name ?? "Unknown location"}</td>
                  <td className="px-4 py-3 text-slate-500">{formatCylinderStatus(row.status)}</td>
                  <td className="px-4 py-3 text-slate-900">{row._count.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AlertCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
