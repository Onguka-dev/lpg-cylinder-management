import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { canManageDeliveries, canViewDeliveries, formatDeliveryStatus, formatFailedDeliveryReason } from "@/lib/deliveries";
import { prisma } from "@/lib/prisma";

export default async function DeliveriesPage({ searchParams }: { searchParams?: { q?: string } }) {
  const session = await getCurrentSession();
  if (!session || !canViewDeliveries(session.user.role)) redirect("/unauthorized");

  const query = searchParams?.q?.trim() ?? "";
  const deliveries = await prisma.delivery.findMany({
    where: query
      ? {
          OR: [
            { deliveryNumber: { contains: query, mode: "insensitive" } },
            { order: { orderNumber: { contains: query, mode: "insensitive" } } },
            { order: { customer: { name: { contains: query, mode: "insensitive" } } } },
            { assignedUser: { name: { contains: query, mode: "insensitive" } } },
            { driverName: { contains: query, mode: "insensitive" } }
          ]
        }
      : undefined,
    include: { order: { include: { customer: true, deliveryZone: true } }, route: true, zone: true, vehicle: true, assignedUser: true },
    orderBy: { updatedAt: "desc" },
    take: 150
  });

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-panel md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Stage 9</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Delivery Management</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Assign orders to routes, zones, vehicles, and MSO/driver users. Track loading, arrival,
            delivered, failed, returned, and exception outcomes with proof of delivery placeholders.
          </p>
        </div>
        {canManageDeliveries(session.user.role) ? <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white" href="/deliveries/new">Assign delivery</Link> : null}
      </section>

      <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <label className="text-sm font-medium text-slate-700">
          Search deliveries
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="q" defaultValue={query} placeholder="Delivery, order, customer, driver" />
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">Search</button>
          </div>
        </label>
      </form>

      <section className="grid gap-3">
        {deliveries.map((delivery) => (
          <Link className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel hover:border-brand-200 hover:bg-brand-50" href={`/deliveries/${delivery.id}`} key={delivery.id}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-slate-950">{delivery.deliveryNumber}</p>
                <p className="mt-1 text-sm text-slate-500">{delivery.order.orderNumber} - {delivery.order.customer.name}</p>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-3 md:text-right">
                <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">{formatDeliveryStatus(delivery.status)}</span>
                <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">{delivery.assignedUser?.name ?? delivery.driverName ?? "Driver placeholder"}</span>
                <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">{delivery.failedReason ? formatFailedDeliveryReason(delivery.failedReason) : delivery.zone?.name ?? delivery.order.deliveryZone?.name ?? "Zone"}</span>
              </div>
            </div>
          </Link>
        ))}
        {!deliveries.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No delivery assignments found.</p> : null}
      </section>
    </div>
  );
}
