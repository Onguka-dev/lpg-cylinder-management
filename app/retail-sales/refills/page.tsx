import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { getSalesLocationForSession } from "@/lib/refill-sales-access";
import { canManageRefillSales, formatPaymentMethod } from "@/lib/refill-sales";
import { prisma } from "@/lib/prisma";

export default async function RefillOrdersPage({ searchParams }: { searchParams?: { q?: string } }) {
  const session = await getCurrentSession();
  const query = searchParams?.q?.trim() ?? "";
  const locationId = session?.user.role === "RSO" ? await getSalesLocationForSession(session) : null;
  const orders = await prisma.refillOrder.findMany({
    where: {
      AND: [
        locationId ? { locationId } : {},
        query
          ? {
              OR: [
                { orderNumber: { contains: query, mode: "insensitive" } },
                { invoiceNumber: { contains: query, mode: "insensitive" } },
                { receiptNumber: { contains: query, mode: "insensitive" } },
                { customer: { name: { contains: query, mode: "insensitive" } } },
                { customer: { phone: { contains: query, mode: "insensitive" } } }
              ]
            }
          : {}
      ]
    },
    include: { customer: true, sku: true, location: true, payment: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  const canCreate = session ? canManageRefillSales(session.user.role) : false;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-panel md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Stage 6</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Walk-in Refill Sales</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            RSO refill transactions exchange an empty cylinder for a filled one,
            record payment, generate invoice/receipt numbers, and close the order.
          </p>
        </div>
        {canCreate ? <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white" href="/retail-sales/refills/new">New refill</Link> : null}
      </section>

      <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <label className="text-sm font-medium text-slate-700">
          Search refills
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" name="q" defaultValue={query} placeholder="Order, invoice, receipt, customer, or phone" />
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">Search</button>
          </div>
        </label>
      </form>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Outlet</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{order.orderNumber}</td>
                  <td className="px-4 py-3 text-slate-700">{order.customer.name}</td>
                  <td className="px-4 py-3 text-slate-700">{order.sku.name}</td>
                  <td className="px-4 py-3 text-slate-500">{order.location.name}</td>
                  <td className="px-4 py-3 text-slate-500">{formatPaymentMethod(order.paymentMethod)}</td>
                  <td className="px-4 py-3 text-slate-700">{order.totalAmount.toString()}</td>
                  <td className="px-4 py-3 text-slate-500">{order.status}</td>
                  <td className="px-4 py-3"><Link className="font-medium text-brand-700" href={`/retail-sales/refills/${order.id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
