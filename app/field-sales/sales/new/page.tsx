import { redirect } from "next/navigation";
import { FieldSaleForm } from "@/components/field-sale-form";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { getCurrentSession } from "@/lib/auth";
import { canManageFieldSales } from "@/lib/field-sales";
import { getFieldAssignment } from "@/lib/field-sales-access";
import { prisma } from "@/lib/prisma";

export default async function NewFieldSalePage() {
  const session = await getCurrentSession();
  if (!session || !canManageFieldSales(session.user.role)) redirect("/unauthorized");

  const assignment = await getFieldAssignment();
  const vehicleId = assignment.vehicle?.id;
  const [customers, skus, groupedStock, prices] = await Promise.all([
    prisma.customer.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, take: 100 }),
    prisma.masterDataRecord.findMany({ where: { type: "SKU_MASTER", isActive: true }, orderBy: { name: "asc" } }),
    vehicleId
      ? prisma.cylinder.groupBy({
          by: ["skuId", "status"],
          where: { currentLocationId: vehicleId, status: { in: ["FILLED", "EMPTY"] } },
          _count: { id: true }
        })
      : [],
    prisma.masterDataRecord.findMany({ where: { type: "PRICE", isActive: true }, orderBy: { updatedAt: "desc" } })
  ]);

  const stock = skus.map((sku) => ({
    skuId: sku.id,
    skuName: sku.name,
    filledQuantity: groupedStock.find((row) => row.skuId === sku.id && row.status === "FILLED")?._count.id ?? 0,
    emptyQuantity: groupedStock.find((row) => row.skuId === sku.id && row.status === "EMPTY")?._count.id ?? 0
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-24 sm:pb-0">
      <PageHeader
        eyebrow="MSO mobile workflow"
        title="New Field Order / Sale"
        description="Search a customer, select route/zone stock, capture payment and close the delivery sale using existing vehicle stock logic."
      />

      <SectionCard title="Order, payment and delivery details" description="Current model supports one cylinder exchange per field sale. Multi-line orders remain in Order Management.">
        <FieldSaleForm
          customers={customers}
          skus={skus}
          stock={stock}
          assignment={{
            vehicleName: assignment.vehicle?.name ?? "No vehicle assigned",
            routeName: assignment.route?.name ?? "Route placeholder",
            zoneName: assignment.zone?.name ?? "Zone placeholder"
          }}
          prices={skus.map((sku) => ({
            skuId: sku.id,
            amount: Number(prices.find((price) => price.parentId === sku.id || price.code === `PRICE-${sku.code.replace(/^LPG-/, "")}`)?.amount ?? 0)
          }))}
        />
      </SectionCard>
    </div>
  );
}
