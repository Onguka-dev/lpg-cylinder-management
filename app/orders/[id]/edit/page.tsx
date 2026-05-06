import { notFound, redirect } from "next/navigation";
import { OrderForm } from "@/components/order-form";
import { getCurrentSession } from "@/lib/auth";
import { canManageOrders, canModifyOrderStatus } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export default async function EditOrderPage({ params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (!session || !canManageOrders(session.user.role)) redirect("/unauthorized");
  const order = await prisma.customerOrder.findUnique({ where: { id: params.id }, include: { items: true } });
  if (!order) notFound();
  if (!canModifyOrderStatus(order.status)) redirect(`/orders/${order.id}`);
  const [customers, skus, zones] = await Promise.all([
    prisma.customer.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, take: 150 }),
    prisma.masterDataRecord.findMany({ where: { type: "SKU_MASTER", isActive: true }, orderBy: { name: "asc" } }),
    prisma.masterDataRecord.findMany({ where: { type: "ZONE", isActive: true }, orderBy: { name: "asc" } })
  ]);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 7</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Edit Order</h1>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <OrderForm
          customers={customers}
          skus={skus}
          zones={zones}
          order={{
            id: order.id,
            customerId: order.customerId,
            channel: order.channel,
            isPriority: order.isPriority,
            deliveryZoneId: order.deliveryZoneId,
            expectedDeliveryDate: order.expectedDeliveryDate?.toISOString().slice(0, 10),
            notes: order.notes,
            items: order.items.map((item) => ({ skuId: item.skuId, quantity: item.quantity, notes: item.notes }))
          }}
        />
      </section>
    </div>
  );
}
