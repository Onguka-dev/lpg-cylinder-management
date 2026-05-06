import { redirect } from "next/navigation";
import { FieldSaleForm } from "@/components/field-sale-form";
import { getCurrentSession } from "@/lib/auth";
import { canManageFieldSales } from "@/lib/field-sales";
import { getFieldAssignment } from "@/lib/field-sales-access";
import { prisma } from "@/lib/prisma";

export default async function NewFieldSalePage() {
  const session = await getCurrentSession();
  if (!session || !canManageFieldSales(session.user.role)) redirect("/unauthorized");

  const assignment = await getFieldAssignment();
  const vehicleId = assignment.vehicle?.id;
  const [customers, skus, groupedStock] = await Promise.all([
    prisma.customer.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, take: 100 }),
    prisma.masterDataRecord.findMany({ where: { type: "SKU_MASTER", isActive: true }, orderBy: { name: "asc" } }),
    vehicleId
      ? prisma.cylinder.groupBy({
          by: ["skuId", "status"],
          where: { currentLocationId: vehicleId, status: { in: ["FILLED", "EMPTY"] } },
          _count: { id: true }
        })
      : []
  ]);

  const stock = skus.map((sku) => ({
    skuId: sku.id,
    skuName: sku.name,
    filledQuantity: groupedStock.find((row) => row.skuId === sku.id && row.status === "FILLED")?._count.id ?? 0,
    emptyQuantity: groupedStock.find((row) => row.skuId === sku.id && row.status === "EMPTY")?._count.id ?? 0
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <p className="text-sm font-semibold text-brand-700">Stage 8</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">New MSO Instant Sale</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Select or register a field customer, issue a filled cylinder from vehicle stock,
          collect an empty cylinder, capture payment, and close the transaction.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <FieldSaleForm
          customers={customers}
          skus={skus}
          stock={stock}
          assignment={{
            vehicleName: assignment.vehicle?.name ?? "No vehicle assigned",
            routeName: assignment.route?.name ?? "Route placeholder",
            zoneName: assignment.zone?.name ?? "Zone placeholder"
          }}
        />
      </section>
    </div>
  );
}
