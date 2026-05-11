import Link from "next/link";
import { InventoryMovementStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildSellingPointSearchWhere, getSellingPointLocations } from "@/lib/selling-point-distribution-posting";
import { formatSellingPointLabel, sellingPointDestinationCodes } from "@/lib/selling-point-distribution";

export default async function SellingPointDispatchesPage({
  searchParams
}: {
  searchParams?: { q?: string; status?: string };
}) {
  const q = searchParams?.q ?? "";
  const status = searchParams?.status && Object.values(InventoryMovementStatus).includes(searchParams.status as InventoryMovementStatus)
    ? searchParams.status
    : "";
  const { destinations } = await getSellingPointLocations(prisma);
  const movements = await prisma.inventoryMovement.findMany({
    where: buildSellingPointSearchWhere(q, status),
    include: { sku: true, sourceLocation: true, destinationLocation: true, cylinders: true },
    orderBy: { updatedAt: "desc" },
    take: 150
  });
  const balances = await prisma.cylinder.groupBy({
    by: ["currentLocationId", "status", "cylinderSizeKg"],
    where: {
      currentLocation: { code: { in: [...sellingPointDestinationCodes] } },
      status: { in: ["FILLED", "FILLED_AT_SELLING_POINT", "FILLED_AT_WAREHOUSE", "EMPTY"] }
    },
    _count: { _all: true },
    orderBy: [{ currentLocationId: "asc" }, { cylinderSizeKg: "asc" }]
  });
  const destinationById = new Map(destinations.map((destination) => [destination.id, destination]));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-700">Stage 7</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Dispatch to Selling Points</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Move filled cylinders from Wandiege to Ugunja, vans, service stations, and Western Kenya service centres with scan-controlled dispatch and receipt.
            </p>
          </div>
          <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white" href="/inventory/selling-point-dispatches/new">
            New dispatch
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]" action="/inventory/selling-point-dispatches">
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="q" placeholder="Search transfer, barcode, source, destination" defaultValue={q} />
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" name="status" defaultValue={status}>
            <option value="">All receiving statuses</option>
            {Object.values(InventoryMovementStatus).map((item) => <option value={item} key={item}>{formatSellingPointLabel(item)}</option>)}
          </select>
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" type="submit">Search</button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Destination stock dashboard</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Destination</th>
                <th className="px-3 py-2">Size</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {balances.map((balance) => (
                <tr key={`${balance.currentLocationId}-${balance.status}-${balance.cylinderSizeKg}`}>
                  <td className="px-3 py-2 font-medium text-slate-900">{destinationById.get(balance.currentLocationId)?.name ?? "Destination"}</td>
                  <td className="px-3 py-2">{balance.cylinderSizeKg ?? "-"}kg</td>
                  <td className="px-3 py-2">{formatSellingPointLabel(balance.status)}</td>
                  <td className="px-3 py-2 text-right">{balance._count._all}</td>
                </tr>
              ))}
              {!balances.length ? <tr><td className="px-3 py-4 text-slate-500" colSpan={4}>No destination stock yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">In-transit and received transfers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Transfer</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Expected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.map((movement) => {
                const overdue = movement.status === "DISPATCHED" && movement.expectedReceiptAt && movement.expectedReceiptAt < new Date();
                return (
                  <tr key={movement.id}>
                    <td className="px-4 py-3"><Link className="font-semibold text-brand-700 hover:underline" href={`/inventory/selling-point-dispatches/${movement.id}`}>{movement.reference}</Link></td>
                    <td className="px-4 py-3">{movement.destinationLocation?.name ?? "-"}</td>
                    <td className="px-4 py-3">{movement.sku.code}</td>
                    <td className="px-4 py-3">{formatSellingPointLabel(movement.status)}{overdue ? <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Overdue</span> : null}</td>
                    <td className="px-4 py-3">{movement.receivedQuantity ?? movement.dispatchedQuantity ?? movement.requestedQuantity}</td>
                    <td className="px-4 py-3">{movement.expectedReceiptAt ? movement.expectedReceiptAt.toLocaleString("en-KE") : "-"}</td>
                  </tr>
                );
              })}
              {!movements.length ? <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>No selling point dispatches found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
