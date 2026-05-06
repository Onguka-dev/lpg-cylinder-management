import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { canManageFieldSales, canViewFieldSales } from "@/lib/field-sales";
import { getFieldAssignment } from "@/lib/field-sales-access";
import { formatCylinderStatus } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export default async function FieldSalesPage() {
  const session = await getCurrentSession();

  if (!session || !canViewFieldSales(session.user.role)) {
    redirect("/unauthorized");
  }

  const assignment = await getFieldAssignment();
  const vehicleId = assignment.vehicle?.id;
  const [stock, customers, orders, recentSales] = await Promise.all([
    vehicleId
      ? prisma.cylinder.groupBy({
          by: ["skuId", "status"],
          where: { currentLocationId: vehicleId },
          _count: { id: true }
        })
      : [],
    prisma.customer.findMany({ where: { status: "ACTIVE" }, orderBy: { updatedAt: "desc" }, take: 5 }),
    prisma.customerOrder.findMany({
      where: { channel: "MSO", status: { in: ["CONFIRMED", "ASSIGNED", "DISPATCHED"] } },
      include: { customer: true, deliveryZone: true, items: { include: { sku: true } } },
      orderBy: [{ isPriority: "desc" }, { expectedDeliveryDate: "asc" }],
      take: 5
    }),
    prisma.fieldSale.findMany({
      where: vehicleId && session.user.role === "MSO" ? { vehicleId } : {},
      include: { customer: true, sku: true },
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ]);

  const skuIds = Array.from(new Set(stock.map((row) => row.skuId)));
  const skus = await prisma.masterDataRecord.findMany({ where: { id: { in: skuIds } } });
  const skuNameById = new Map(skus.map((sku) => [sku.id, sku.name]));
  const canCreate = canManageFieldSales(session.user.role);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 8</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">MSO Field Sales</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Mobile sales officers can work from assigned vehicle stock, register field customers, close instant sales,
              collect empty cylinders, capture payment references, and report discrepancies.
            </p>
          </div>
          {canCreate ? (
            <Link className="rounded-lg bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white" href="/field-sales/sales/new">
              Instant sale
            </Link>
          ) : null}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <AssignmentCard label="Vehicle" value={assignment.vehicle?.name ?? "No vehicle assigned"} detail={assignment.vehicle?.code ?? "Configure a VEHICLE master record"} />
        <AssignmentCard label="Route" value={assignment.route?.name ?? "Route placeholder"} detail={assignment.route?.code ?? "Stage 15 sync hook pending"} />
        <AssignmentCard label="Zone" value={assignment.zone?.name ?? "Zone placeholder"} detail={assignment.zone?.code ?? "Assigned zone"} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-950">Vehicle Inventory</h2>
            <Link className="text-sm font-medium text-brand-700" href="/field-sales/sales">Sale history</Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {stock.length ? stock.map((row) => (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={`${row.skuId}-${row.status}`}>
                <p className="text-sm font-semibold text-slate-900">{skuNameById.get(row.skuId) ?? "Unknown SKU"}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{row._count.id}</p>
                <p className="mt-1 text-sm text-slate-500">{formatCylinderStatus(row.status)}</p>
              </div>
            )) : (
              <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">No assigned vehicle stock found.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-slate-950">Quick Actions</h2>
          <div className="mt-4 grid gap-3">
            {canCreate ? <Action href="/customers/new" label="Field customer registration" /> : null}
            {canCreate ? <Action href="/field-sales/sales/new" label="Instant sale and payment capture" /> : null}
            <Action href="/orders" label="Delivery status update placeholder" />
            <Action href="/field-sales/sales/new" label="Empty cylinder collection" />
            <Action href="/field-sales/sales/new" label="Discrepancy reporting" />
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              Offline queue and sync hooks are reserved for Stage 15.
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Panel title="Assigned Customers">
          {customers.map((customer) => (
            <Link className="block rounded-lg border border-slate-200 p-3 text-sm hover:border-brand-200 hover:bg-brand-50" href={`/customers/${customer.id}`} key={customer.id}>
              <span className="font-medium text-slate-900">{customer.name}</span>
              <span className="mt-1 block text-slate-500">{customer.phone}</span>
            </Link>
          ))}
        </Panel>

        <Panel title="Assigned Orders">
          {orders.length ? orders.map((order) => (
            <Link className="block rounded-lg border border-slate-200 p-3 text-sm hover:border-brand-200 hover:bg-brand-50" href={`/orders/${order.id}`} key={order.id}>
              <span className="font-medium text-slate-900">{order.orderNumber}</span>
              <span className="mt-1 block text-slate-500">{order.customer.name} - {order.status}</span>
            </Link>
          )) : <p className="text-sm text-slate-500">No MSO-assigned orders yet.</p>}
        </Panel>

        <Panel title="Recent Field Sales">
          {recentSales.length ? recentSales.map((sale) => (
            <Link className="block rounded-lg border border-slate-200 p-3 text-sm hover:border-brand-200 hover:bg-brand-50" href={`/field-sales/sales/${sale.id}`} key={sale.id}>
              <span className="font-medium text-slate-900">{sale.saleNumber}</span>
              <span className="mt-1 block text-slate-500">{sale.customer.name} - {sale.sku.name}</span>
            </Link>
          )) : <p className="text-sm text-slate-500">No field sales have been closed yet.</p>}
        </Panel>
      </section>
    </div>
  );
}

function AssignmentCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-3">{children}</div>
    </div>
  );
}

function Action({ href, label }: { href: string; label: string }) {
  return (
    <Link className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700" href={href}>
      {label}
    </Link>
  );
}
