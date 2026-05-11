import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { getAssignedMasterLocationId } from "@/lib/inventory-movement-access";
import {
  canRequestInventoryMovements,
  formatMovementStatus,
  formatMovementType
} from "@/lib/inventory-movements";
import { formatCylinderStatus } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export default async function InventoryMovementsPage({
  searchParams
}: {
  searchParams?: { q?: string };
}) {
  const session = await getCurrentSession();
  const query = searchParams?.q?.trim() ?? "";
  const assignedLocationId =
    session?.user.role === "RSO" || session?.user.role === "MSO"
      ? await getAssignedMasterLocationId(session.user.id).catch(() => null)
      : null;
  const movements = await prisma.inventoryMovement.findMany({
    where: {
      AND: [
        query
          ? {
              OR: [
                { reference: { contains: query, mode: "insensitive" } },
                { sku: { name: { contains: query, mode: "insensitive" } } },
                { sourceLocation: { name: { contains: query, mode: "insensitive" } } },
                { destinationLocation: { name: { contains: query, mode: "insensitive" } } }
              ]
            }
          : {},
        assignedLocationId
          ? {
              OR: [
                { sourceLocationId: assignedLocationId },
                { destinationLocationId: assignedLocationId }
              ]
            }
          : {}
      ]
    },
    include: {
      sku: true,
      sourceLocation: true,
      destinationLocation: true,
      requestedBy: true
    },
    orderBy: { updatedAt: "desc" },
    take: 150
  }).catch(() => []);
  const canRequest = session ? canRequestInventoryMovements(session.user.role) : false;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-panel md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Stage 5</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Inventory Movements</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Request, approve, dispatch, receive, and audit stock movements.
            Balances update when cylinders are dispatched, received, or completed.
          </p>
        </div>
        {canRequest ? (
          <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white" href="/inventory/movements/new">
            New Movement
          </Link>
        ) : null}
      </section>

      <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <label className="text-sm font-medium text-slate-700">
          Search movements
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="q" defaultValue={query} placeholder="Search reference, SKU, or location" />
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">Search</button>
          </div>
        </label>
      </form>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Status Flow</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Workflow</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!movements.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={8}>
                    No inventory movements are available yet. If this is the hosted demo, the database may still need provisioning or migration.
                  </td>
                </tr>
              ) : null}
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{movement.reference}</td>
                  <td className="px-4 py-3 text-slate-700">{formatMovementType(movement.type)}</td>
                  <td className="px-4 py-3 text-slate-700">{movement.sku.name}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {movement.sourceLocation?.name ?? "External"} to {movement.destinationLocation?.name ?? "External"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {movement.sourceStatus ? `${formatCylinderStatus(movement.sourceStatus)} to ` : ""}
                    {formatCylinderStatus(movement.destinationStatus)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {movement.receivedQuantity ?? movement.dispatchedQuantity ?? movement.approvedQuantity ?? movement.requestedQuantity}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatMovementStatus(movement.status)}</td>
                  <td className="px-4 py-3">
                    <Link className="font-medium text-brand-700" href={`/inventory/movements/${movement.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
