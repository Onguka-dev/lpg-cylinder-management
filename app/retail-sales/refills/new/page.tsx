import { redirect } from "next/navigation";
import { RefillOrderForm } from "@/components/refill-order-form";
import { getCurrentSession } from "@/lib/auth";
import { locationMasterTypes } from "@/lib/inventory";
import { getSalesLocationForSession } from "@/lib/refill-sales-access";
import { canManageRefillSales } from "@/lib/refill-sales";
import { prisma } from "@/lib/prisma";

export default async function NewRefillOrderPage() {
  const session = await getCurrentSession();

  if (!session || !canManageRefillSales(session.user.role)) {
    redirect("/unauthorized");
  }

  const assignedLocationId = session.user.role === "RSO" ? await getSalesLocationForSession(session) : null;
  const [customers, skus, locations, groupedStock, prices] = await Promise.all([
    prisma.customer.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, take: 100 }),
    prisma.masterDataRecord.findMany({ where: { type: "SKU_MASTER", isActive: true }, orderBy: { name: "asc" } }),
    prisma.masterDataRecord.findMany({ where: { type: { in: [...locationMasterTypes] }, isActive: true }, orderBy: { name: "asc" } }),
    prisma.cylinder.groupBy({
      by: ["skuId"],
      where: {
        status: "FILLED",
        ...(assignedLocationId ? { currentLocationId: assignedLocationId } : {})
      },
      _count: { id: true }
    }),
    prisma.masterDataRecord.findMany({ where: { type: "PRICE", isActive: true }, orderBy: { updatedAt: "desc" } })
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 6</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">New Walk-in Refill</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Select or register a customer, choose the refill SKU, confirm filled
          stock at the assigned outlet, collect payment, and close the transaction.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <RefillOrderForm
          customers={customers}
          skus={skus}
          locations={locations}
          isAdmin={session.user.role === "ADMIN"}
          stock={groupedStock.map((row) => ({
            skuId: row.skuId,
            skuName: skus.find((sku) => sku.id === row.skuId)?.name ?? "Unknown SKU",
            filledQuantity: row._count.id
          }))}
          prices={skus.map((sku) => ({
            skuId: sku.id,
            amount: Number(prices.find((price) => price.parentId === sku.id || price.code === `PRICE-${sku.code.replace(/^LPG-/, "")}`)?.amount ?? 0)
          }))}
        />
      </section>
    </div>
  );
}
