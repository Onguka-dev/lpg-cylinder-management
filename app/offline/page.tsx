import { redirect } from "next/navigation";
import { OfflineWorkspace } from "@/components/offline-workspace";
import { getCurrentSession } from "@/lib/auth";
import { getFieldAssignment } from "@/lib/field-sales-access";
import { canUseOfflineMode, formatOfflineSyncStatus } from "@/lib/offline";
import { prisma } from "@/lib/prisma";

export default async function OfflinePage() {
  const session = await getCurrentSession();
  if (!session || !canUseOfflineMode(session.user.role)) redirect("/unauthorized");

  const assignment = await getFieldAssignment();
  const vehicleId = assignment.vehicle?.id;
  const [deliveries, stock, customers, skus, recentSync] = await Promise.all([
    prisma.delivery.findMany({
      where: {
        ...(session.user.role === "MSO" ? { assignedUserId: session.user.id } : {}),
        status: { in: ["ASSIGNED", "LOADING_CONFIRMED", "CUSTOMER_ARRIVAL"] }
      },
      include: {
        order: { include: { customer: true, deliveryZone: true, items: { include: { sku: true } } } },
        route: true,
        zone: true,
        vehicle: true,
        assignedUser: true
      },
      orderBy: { updatedAt: "desc" },
      take: 25
    }),
    vehicleId
      ? prisma.cylinder.groupBy({
          by: ["skuId", "status"],
          where: { currentLocationId: vehicleId },
          _count: { _all: true }
        })
      : [],
    prisma.customer.findMany({ where: { status: "ACTIVE" }, orderBy: { updatedAt: "desc" }, take: 25 }),
    prisma.masterDataRecord.findMany({ where: { type: "SKU_MASTER", isActive: true }, orderBy: { name: "asc" } }),
    prisma.offlineSyncItem.findMany({
      where: session.user.role === "MSO" ? { createdById: session.user.id } : undefined,
      orderBy: { updatedAt: "desc" },
      take: 8
    })
  ]);
  const skuName = new Map(skus.map((sku) => [sku.id, sku.name]));
  const context = {
    capturedAt: new Date().toISOString(),
    assignment,
    deliveries: deliveries.map((delivery) => ({
      id: delivery.id,
      deliveryNumber: delivery.deliveryNumber,
      status: delivery.status,
      updatedAt: delivery.updatedAt.toISOString(),
      customerName: delivery.order.customer.name,
      customerPhone: delivery.order.customer.phone,
      orderNumber: delivery.order.orderNumber,
      zoneName: delivery.zone?.name ?? delivery.order.deliveryZone?.name ?? "Zone placeholder"
    })),
    vehicleStock: stock.map((row) => ({
      skuId: row.skuId,
      skuName: skuName.get(row.skuId) ?? "Unknown SKU",
      status: row.status,
      quantity: row._count._all
    })),
    customers: customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      proofReference: customer.proofReference,
      category: customer.category,
      address: customer.address
    })),
    skus: skus.map((sku) => ({ id: sku.id, name: sku.name, code: sku.code }))
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 15</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Offline Mode</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Browser-friendly offline workspace for assigned deliveries, vehicle stock snapshots, customer drafts,
          delivery updates, proof of delivery drafts, and field sales drafts. Sync never overwrites live records silently.
        </p>
      </section>

      <OfflineWorkspace userId={session.user.id} initialContext={context} />

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Recent Server Sync Review</h2>
        <div className="mt-4 grid gap-3">
          {recentSync.length ? recentSync.map((item) => (
            <div className="rounded-lg border border-slate-200 px-4 py-3 text-sm" key={item.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-medium text-slate-950">{item.clientId}</p>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{formatOfflineSyncStatus(item.status)}</span>
              </div>
              <p className="mt-2 text-slate-600">{item.conflictReason ?? item.failedReason ?? "Stored for server review."}</p>
            </div>
          )) : <p className="text-sm text-slate-500">No server sync review records yet.</p>}
        </div>
      </section>
    </div>
  );
}
