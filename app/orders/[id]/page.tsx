import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusActions } from "@/components/order-status-actions";
import { canModifyOrderStatus, formatOrderChannel, formatOrderStatus } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.customerOrder.findUnique({
    where: { id: params.id },
    include: { customer: true, deliveryZone: true, createdBy: true, items: { include: { sku: true }, orderBy: { createdAt: "asc" } }, historyEntries: { include: { changedBy: true }, orderBy: { createdAt: "desc" } } }
  });
  if (!order) notFound();
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-panel md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">{formatOrderStatus(order.status)}</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">{order.orderNumber}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{order.customer.name} via {formatOrderChannel(order.channel)}.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canModifyOrderStatus(order.status) ? <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href={`/orders/${order.id}/edit`}>Edit</Link> : null}
          <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href="/orders">Back</Link>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-4">
        <Summary label="Priority" value={order.isPriority ? "Yes" : "No"} />
        <Summary label="Zone" value={order.deliveryZone?.name ?? "Not set"} />
        <Summary label="Expected Delivery" value={order.expectedDeliveryDate?.toISOString().slice(0, 10) ?? "Not set"} />
        <Summary label="Lines" value={String(order.items.length)} />
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Workflow</h2>
        <div className="mt-4"><OrderStatusActions orderId={order.id} status={order.status} /></div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Order Items</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">SKU</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Notes</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{order.items.map((item) => <tr key={item.id}><td className="px-3 py-2 font-medium">{item.sku.name}</td><td className="px-3 py-2">{item.quantity}</td><td className="px-3 py-2 text-slate-500">{item.notes ?? "None"}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Order History</h2>
        <div className="mt-4 space-y-3">{order.historyEntries.map((entry) => <div className="rounded-lg border border-slate-200 px-4 py-3 text-sm" key={entry.id}><p className="font-medium">{entry.action}</p><p className="text-slate-600">{entry.details}</p><p className="text-xs text-slate-500">{entry.fromStatus ? `${formatOrderStatus(entry.fromStatus)} to ` : ""}{formatOrderStatus(entry.toStatus)} by {entry.changedBy?.name ?? "System"}</p></div>)}</div>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold text-slate-950">{value}</p></div>;
}
