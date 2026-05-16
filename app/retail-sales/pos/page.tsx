import { redirect } from "next/navigation";
import { SellingPointPosForm } from "@/components/selling-point-pos-form";
import { getCurrentSession } from "@/lib/auth";
import { locationMasterTypes } from "@/lib/inventory";
import { getSalesLocationForSession } from "@/lib/refill-sales-access";
import { canManageFullCylinderSales } from "@/lib/full-cylinder-sales";
import { canManageRefillSales } from "@/lib/refill-sales";
import { prisma } from "@/lib/prisma";

export default async function SellingPointPosPage() {
  const session = await getCurrentSession();
  if (!session || (!canManageFullCylinderSales(session.user.role) && !canManageRefillSales(session.user.role))) {
    redirect("/unauthorized");
  }

  const assignedLocationId = ["RSO", "MSO", "SERVICE_CENTRE_STAFF"].includes(session.user.role)
    ? await getSalesLocationForSession(session).catch(() => null)
    : null;

  const [customers, skus, locations, groupedStock, prices] = await Promise.all([
    prisma.customer.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, take: 100 }).catch(() => []),
    prisma.masterDataRecord.findMany({ where: { type: "SKU_MASTER", isActive: true }, orderBy: { name: "asc" } }).catch(() => []),
    prisma.masterDataRecord.findMany({ where: { type: { in: [...locationMasterTypes] }, isActive: true }, orderBy: { name: "asc" } }).catch(() => []),
    prisma.cylinder.groupBy({
      by: ["skuId"],
      where: {
        status: { in: ["FILLED", "FILLED_AT_SELLING_POINT"] },
        ...(assignedLocationId ? { currentLocationId: assignedLocationId } : {})
      },
      _count: { id: true }
    }).catch(() => []),
    prisma.masterDataRecord.findMany({ where: { type: "PRICE", isActive: true }, orderBy: { updatedAt: "desc" } }).catch(() => [])
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Selling Point POS</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">New sale</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Register or select the customer, scan outgoing and returned cylinders, collect payment, and produce the receipt from the existing sale workflows.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <SellingPointPosForm
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
