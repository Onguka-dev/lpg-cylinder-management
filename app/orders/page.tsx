import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { canManageOrders, formatOrderChannel, formatOrderStatus } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export default async function OrdersPage({ searchParams }: { searchParams?: { q?: string } }) {
  const session = await getCurrentSession();
  const query = searchParams?.q?.trim() ?? "";
  const orders = await prisma.customerOrder.findMany({
    where: query ? {
      OR: [
        { orderNumber: { contains: query, mode: "insensitive" } },
        { customer: { name: { contains: query, mode: "insensitive" } } },
        { customer: { phone: { contains: query, mode: "insensitive" } } }
      ]
    } : undefined,
    include: { customer: true, deliveryZone: true, items: { include: { sku: true } } },
    orderBy: [{ isPriority: "desc" }, { updatedAt: "desc" }],
    take: 150
  });
  const canCreate = session ? canManageOrders(session.user.role) : false;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-panel md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Stage 7</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Order Management</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Create, review, and progress customer orders with priority, channel,
            delivery zone, expected delivery date, and multiple line items.
          </p>
        </div>
        {canCreate ? <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white" href="/orders/new">New order</Link> : null}
      </section>
      <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="q" defaultValue={query} placeholder="Search order, customer, or phone" />
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">Search</button>
        </div>
      </form>
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Channel</th><th className="px-4 py-3">Zone</th><th className="px-4 py-3">Lines</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{order.orderNumber}</td>
                  <td className="px-4 py-3 text-slate-700">{order.customer.name}</td>
                  <td className="px-4 py-3 text-slate-500">{formatOrderChannel(order.channel)}</td>
                  <td className="px-4 py-3 text-slate-500">{order.deliveryZone?.name ?? "Not set"}</td>
                  <td className="px-4 py-3 text-slate-700">{order.items.length}</td>
                  <td className="px-4 py-3 text-slate-500">{order.isPriority ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-slate-500">{formatOrderStatus(order.status)}</td>
                  <td className="px-4 py-3"><Link className="font-medium text-brand-700" href={`/orders/${order.id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
