import { redirect } from "next/navigation";
import { DeliveryAssignmentForm } from "@/components/delivery-assignment-form";
import { getCurrentSession } from "@/lib/auth";
import { canManageDeliveries } from "@/lib/deliveries";
import { prisma } from "@/lib/prisma";

export default async function NewDeliveryPage() {
  const session = await getCurrentSession();
  if (!session || !canManageDeliveries(session.user.role)) redirect("/unauthorized");

  const [orders, routes, zones, vehicles, users] = await Promise.all([
    prisma.customerOrder.findMany({
      where: {
        status: { in: ["PENDING", "CONFIRMED", "ASSIGNED"] },
        delivery: null
      },
      include: { customer: true },
      orderBy: [{ isPriority: "desc" }, { updatedAt: "desc" }],
      take: 100
    }),
    prisma.masterDataRecord.findMany({ where: { type: "ROUTE", isActive: true }, orderBy: { code: "asc" } }),
    prisma.masterDataRecord.findMany({ where: { type: "ZONE", isActive: true }, orderBy: { code: "asc" } }),
    prisma.masterDataRecord.findMany({ where: { type: "VEHICLE", isActive: true }, orderBy: { code: "asc" } }),
    prisma.user.findMany({ where: { role: { name: { in: ["MSO", "WAREHOUSE_MANAGER"] } } }, include: { role: true }, orderBy: { name: "asc" } })
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 9</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Assign Delivery</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Assign an eligible order to a route, zone, vehicle, and MSO/driver. Full dispatch optimization remains out of scope for this stage.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <DeliveryAssignmentForm
          orders={orders.map((order) => ({ id: order.id, name: order.orderNumber, orderNumber: order.orderNumber, customerName: order.customer.name }))}
          routes={routes}
          zones={zones}
          vehicles={vehicles}
          users={users.map((user) => ({ id: user.id, name: `${user.name} (${user.role.name})` }))}
        />
      </section>
    </div>
  );
}
