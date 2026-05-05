import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { InventoryMovementActions } from "@/components/inventory-movement-actions";
import { getCurrentSession } from "@/lib/auth";
import {
  getAssignedMasterLocationId,
  movementTouchesAssignedLocation
} from "@/lib/inventory-movement-access";
import {
  canViewInventoryMovements,
  formatMovementStatus,
  formatMovementType
} from "@/lib/inventory-movements";
import { formatCylinderStatus } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export default async function InventoryMovementDetailPage({
  params
}: {
  params: { id: string };
}) {
  const session = await getCurrentSession();

  if (!session || !canViewInventoryMovements(session.user.role)) {
    redirect("/unauthorized");
  }

  const movement = await prisma.inventoryMovement.findUnique({
    where: { id: params.id },
    include: {
      sku: true,
      sourceLocation: true,
      destinationLocation: true,
      requestedBy: true,
      approvedBy: true,
      dispatchedBy: true,
      receivedBy: true,
      cylinders: {
        include: { cylinder: true },
        orderBy: { createdAt: "asc" }
      },
      historyEntries: {
        include: { changedBy: true },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!movement) notFound();

  if (session.user.role === "RSO" || session.user.role === "MSO") {
    const assignedLocationId = await getAssignedMasterLocationId(session.user.id);
    if (
      !movementTouchesAssignedLocation({
        assignedLocationId,
        sourceLocationId: movement.sourceLocationId,
        destinationLocationId: movement.destinationLocationId
      })
    ) {
      redirect("/unauthorized");
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-panel md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">{formatMovementType(movement.type)}</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">{movement.reference}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {movement.sourceLocation?.name ?? "External"} to {movement.destinationLocation?.name ?? "External"}.
            Current workflow status: {formatMovementStatus(movement.status)}.
          </p>
        </div>
        <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href="/inventory/movements">
          Back to movements
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Requested" value={movement.requestedQuantity} />
        <SummaryCard label="Approved" value={movement.approvedQuantity ?? "Pending"} />
        <SummaryCard label="Dispatched" value={movement.dispatchedQuantity ?? "Pending"} />
        <SummaryCard label="Received" value={movement.receivedQuantity ?? "Pending"} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Workflow Actions</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Approval is limited to Admin and Warehouse Manager. RSO/MSO users can
          receive stock for assigned locations only.
        </p>
        <div className="mt-4">
          <InventoryMovementActions
            movementId={movement.id}
            status={movement.status}
            requestedQuantity={movement.requestedQuantity}
            approvedQuantity={movement.approvedQuantity}
            dispatchedQuantity={movement.dispatchedQuantity}
            userRole={session.user.role}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Movement Details</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <Detail label="SKU/Size" value={movement.sku.name} />
            <Detail label="Source Status" value={movement.sourceStatus ? formatCylinderStatus(movement.sourceStatus) : "External stock"} />
            <Detail label="Destination Status" value={formatCylinderStatus(movement.destinationStatus)} />
            <Detail label="Requested By" value={movement.requestedBy?.name ?? "Unknown"} />
            <Detail label="Approved By" value={movement.approvedBy?.name ?? "Pending"} />
            <Detail label="Dispatched By" value={movement.dispatchedBy?.name ?? "Pending"} />
            <Detail label="Received By" value={movement.receivedBy?.name ?? "Pending"} />
            <Detail label="Variance" value={movement.varianceQuantity === null ? "None logged" : String(movement.varianceQuantity)} />
            <Detail label="Variance Reason" value={movement.varianceReason ?? "None"} />
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Linked Cylinders</h2>
          <div className="mt-4 space-y-3">
            {movement.cylinders.length ? movement.cylinders.map((line) => (
              <Link className="block rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm hover:border-brand-200" href={`/inventory/cylinders/${line.cylinderId}`} key={line.id}>
                <span className="font-medium text-slate-900">{line.cylinder.serialNumber}</span>
                <span className="ml-2 text-slate-500">{formatCylinderStatus(line.cylinder.status)}</span>
              </Link>
            )) : (
              <p className="rounded-lg border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
                Cylinders are linked when stock is dispatched or received.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Movement History & Audit Trail</h2>
        <div className="mt-4 space-y-3">
          {movement.historyEntries.map((entry) => (
            <div className="rounded-lg border border-slate-200 px-4 py-3 text-sm" key={entry.id}>
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-medium text-slate-900">{entry.action}</p>
                <p className="text-slate-500">{entry.createdAt.toISOString().slice(0, 16).replace("T", " ")}</p>
              </div>
              <p className="mt-1 text-slate-600">{entry.details}</p>
              <p className="mt-1 text-xs text-slate-500">
                {entry.fromStatus ? `${formatMovementStatus(entry.fromStatus)} to ` : ""}
                {formatMovementStatus(entry.toStatus)} by {entry.changedBy?.name ?? "System"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}
