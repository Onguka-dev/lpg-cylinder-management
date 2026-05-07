import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getFieldAssignment } from "@/lib/field-sales-access";
import { canUseOfflineMode } from "@/lib/offline";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to use offline mode." }, { status: 401 });
  if (!canUseOfflineMode(session.user.role)) {
    return NextResponse.json({ error: "Your role cannot use offline mode." }, { status: 403 });
  }

  const assignment = await getFieldAssignment();
  const vehicleId = assignment.vehicle?.id;
  const [deliveries, stock, customers, skus] = await Promise.all([
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
    prisma.masterDataRecord.findMany({ where: { type: "SKU_MASTER", isActive: true }, orderBy: { name: "asc" } })
  ]);

  const skuName = new Map(skus.map((sku) => [sku.id, sku.name]));

  return NextResponse.json({
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
  });
}
