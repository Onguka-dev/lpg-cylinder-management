import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getFieldAssignment, requireFieldSalesViewSession } from "@/lib/field-sales-access";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getCurrentSession();
  const auth = requireFieldSalesViewSession(session);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const assignment = await getFieldAssignment();
  const vehicleId = assignment.vehicle?.id;

  const [stock, customers, orders] = await Promise.all([
    vehicleId
      ? prisma.cylinder.groupBy({
          by: ["skuId", "status"],
          where: { currentLocationId: vehicleId },
          _count: { _all: true }
        })
      : [],
    prisma.customer.findMany({
      where: { status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      take: 8
    }),
    prisma.customerOrder.findMany({
      where: {
        channel: "MSO",
        status: { in: ["CONFIRMED", "ASSIGNED", "DISPATCHED"] }
      },
      include: { customer: true, deliveryZone: true, items: { include: { sku: true } } },
      orderBy: [{ isPriority: "desc" }, { expectedDeliveryDate: "asc" }],
      take: 8
    })
  ]);

  const skuIds = Array.from(new Set(stock.map((row) => row.skuId)));
  const skus = await prisma.masterDataRecord.findMany({
    where: { id: { in: skuIds } }
  });
  const skuNameById = new Map(skus.map((sku) => [sku.id, sku.name]));

  return NextResponse.json({
    assignment,
    stock: stock.map((row) => ({
      skuId: row.skuId,
      skuName: skuNameById.get(row.skuId) ?? "Unknown SKU",
      status: row.status,
      quantity: row._count._all
    })),
    customers,
    orders
  });
}
