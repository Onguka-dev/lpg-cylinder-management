import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DeliveryStatusActions } from "@/components/delivery-status-actions";
import { getCurrentSession } from "@/lib/auth";
import {
  canUpdateDeliveryStatus,
  canViewDeliveries,
  formatDeliveryStatus,
  formatFailedDeliveryReason,
  type DeliveryStatusKey
} from "@/lib/deliveries";
import { formatOrderStatus } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export default async function DeliveryDetailPage({ params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (!session || !canViewDeliveries(session.user.role)) redirect("/unauthorized");

  const delivery = await prisma.delivery.findUnique({
    where: { id: params.id },
    include: {
      order: { include: { customer: true, deliveryZone: true, items: { include: { sku: true } } } },
      route: true,
      zone: true,
      vehicle: true,
      assignedUser: true,
      createdBy: true,
      historyEntries: { include: { changedBy: true }, orderBy: { createdAt: "desc" } }
    }
  });
  if (!delivery) notFound();

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-panel md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">{formatDeliveryStatus(delivery.status)}</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">{delivery.deliveryNumber}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {delivery.order.orderNumber} for {delivery.order.customer.name}; order status is {formatOrderStatus(delivery.order.status)}.
          </p>
        </div>
        <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href="/deliveries">Back</Link>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Summary label="Route" value={delivery.route?.name ?? "Route placeholder"} />
        <Summary label="Zone" value={delivery.zone?.name ?? delivery.order.deliveryZone?.name ?? "Not set"} />
        <Summary label="Vehicle" value={delivery.vehicle?.code ?? "Vehicle placeholder"} />
        <Summary label="Assigned To" value={delivery.assignedUser?.name ?? delivery.driverName ?? "Driver placeholder"} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Proof Of Delivery</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <Detail label="OTP" value={delivery.otp ?? "Not captured"} />
            <Detail label="Signature" value={delivery.signaturePlaceholder ?? "Placeholder"} />
            <Detail label="Photo" value={delivery.photoPlaceholder ?? "Upload placeholder"} />
            <Detail label="GPS" value={delivery.gpsLatitude && delivery.gpsLongitude ? `${delivery.gpsLatitude.toString()}, ${delivery.gpsLongitude.toString()}` : "GPS placeholder"} />
            <Detail label="Customer Remarks" value={delivery.customerRemarks ?? "None"} />
            <Detail label="Failed Reason" value={delivery.failedReason ? formatFailedDeliveryReason(delivery.failedReason) : "None"} />
            <Detail label="Exception Notes" value={delivery.exceptionNotes ?? "None"} />
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Status Update</h2>
          <div className="mt-4">
            {canUpdateDeliveryStatus(session.user.role) ? (
              <DeliveryStatusActions deliveryId={delivery.id} status={delivery.status as DeliveryStatusKey} />
            ) : (
              <p className="text-sm text-slate-500">This role can view delivery records but cannot update delivery status.</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Order Items</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">SKU</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Notes</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{delivery.order.items.map((item) => <tr key={item.id}><td className="px-3 py-2 font-medium">{item.sku.name}</td><td className="px-3 py-2">{item.quantity}</td><td className="px-3 py-2 text-slate-500">{item.notes ?? "None"}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Delivery History</h2>
        <div className="mt-4 space-y-3">
          {delivery.historyEntries.map((entry) => (
            <div className="rounded-lg border border-slate-200 px-4 py-3 text-sm" key={entry.id}>
              <p className="font-medium">{entry.action}</p>
              <p className="text-slate-600">{entry.details}</p>
              <p className="text-xs text-slate-500">{entry.fromStatus ? `${formatDeliveryStatus(entry.fromStatus)} to ` : ""}{formatDeliveryStatus(entry.toStatus)} by {entry.changedBy?.name ?? "System"}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 break-words text-lg font-semibold text-slate-950">{value}</p></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 border-b border-slate-100 pb-2"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium text-slate-900">{value}</dd></div>;
}
