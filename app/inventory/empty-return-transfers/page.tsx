import Link from "next/link";
import { InventoryMovementStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildReverseLogisticsSearchWhere } from "@/lib/reverse-logistics-posting";
import { parseConditionLabel } from "@/lib/reverse-logistics";

export default async function EmptyReturnTransfersPage({ searchParams }: { searchParams?: { q?: string; status?: string } }) {
  const q = searchParams?.q ?? "";
  const status = searchParams?.status && Object.values(InventoryMovementStatus).includes(searchParams.status as InventoryMovementStatus) ? searchParams.status : "";
  const [movements, balances, overdueCustodies, damagedReturns] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where: buildReverseLogisticsSearchWhere(q, status),
      include: { sku: true, sourceLocation: true, destinationLocation: true, cylinders: true },
      orderBy: { updatedAt: "desc" },
      take: 150
    }),
    prisma.cylinder.groupBy({
      by: ["status", "currentLocationId", "cylinderSizeKg"],
      where: { status: { in: ["EMPTY_AT_SELLING_POINT", "EMPTY_IN_TRANSIT", "EMPTY_AT_WAREHOUSE", "DAMAGED", "QUARANTINED"] } },
      _count: { _all: true },
      orderBy: [{ status: "asc" }, { cylinderSizeKg: "asc" }]
    }),
    prisma.customerCylinderCustody.count({ where: { returnDate: null, expectedReturnFollowUpDate: { lt: new Date() } } }),
    prisma.cylinder.count({ where: { OR: [{ status: "DAMAGED" }, { quarantinedStatus: true }, { unsafeStatus: true }] } })
  ]);
  const locations = await prisma.masterDataRecord.findMany({ where: { id: { in: balances.map((row) => row.currentLocationId) } } });
  const locationName = new Map(locations.map((location) => [location.id, location.name]));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-700">Reverse logistics</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Empty returns to warehouse</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Track empties collected from customers, dispatched from selling points, received at warehouse, and damaged returns routed away from normal refill stock.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href="/retail-sales/empty-returns/new">Customer return</Link>
            <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white" href="/inventory/empty-return-transfers/new">Dispatch empties</Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Summary label="Empties at Selling Point" value={countStatus(balances, "EMPTY_AT_SELLING_POINT")} />
        <Summary label="Empties In Transit" value={countStatus(balances, "EMPTY_IN_TRANSIT")} />
        <Summary label="Empties at Warehouse" value={countStatus(balances, "EMPTY_AT_WAREHOUSE")} />
        <Summary label="Damaged / Quarantine" value={damagedReturns} detail={`${overdueCustodies} overdue customer returns`} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Reverse stock balances</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Location</th><th className="px-3 py-2">Size</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Qty</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {balances.map((row) => <tr key={`${row.currentLocationId}-${row.status}-${row.cylinderSizeKg}`}><td className="px-3 py-2">{locationName.get(row.currentLocationId) ?? "Location"}</td><td className="px-3 py-2">{row.cylinderSizeKg ?? "-"}kg</td><td className="px-3 py-2">{parseConditionLabel(row.status)}</td><td className="px-3 py-2 text-right">{row._count._all}</td></tr>)}
              {!balances.length ? <tr><td className="px-3 py-4 text-slate-500" colSpan={4}>No returned empties found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]" action="/inventory/empty-return-transfers">
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="q" placeholder="Search transfer, barcode, source, warehouse" defaultValue={q} />
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {Object.values(InventoryMovementStatus).map((item) => <option value={item} key={item}>{parseConditionLabel(item)}</option>)}
          </select>
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" type="submit">Search</button>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Transfer</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Warehouse</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Qty</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {movements.map((movement) => <tr key={movement.id}><td className="px-4 py-3"><Link className="font-semibold text-brand-700 hover:underline" href={`/inventory/empty-return-transfers/${movement.id}`}>{movement.reference}</Link></td><td className="px-4 py-3">{movement.sourceLocation?.name ?? "-"}</td><td className="px-4 py-3">{movement.destinationLocation?.name ?? "-"}</td><td className="px-4 py-3">{movement.sku.code}</td><td className="px-4 py-3">{parseConditionLabel(movement.status)}</td><td className="px-4 py-3">{movement.receivedQuantity ?? movement.dispatchedQuantity ?? movement.requestedQuantity}</td></tr>)}
            {!movements.length ? <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>No empty return transfers found.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Summary({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold text-slate-950">{value.toLocaleString()}</p>{detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}</div>;
}

function countStatus(rows: { status: string; _count: { _all: number } }[], status: string) {
  return rows.filter((row) => row.status === status).reduce((sum, row) => sum + row._count._all, 0);
}
