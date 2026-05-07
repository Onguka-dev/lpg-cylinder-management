import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { deliveryAssignmentSchema, generateDeliveryNumber } from "@/lib/deliveries";
import { requireDeliveryManageSession, requireDeliveryViewSession } from "@/lib/delivery-access";
import { createMockNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const includeDelivery = {
  order: { include: { customer: true, deliveryZone: true, items: { include: { sku: true } } } },
  route: true,
  zone: true,
  vehicle: true,
  assignedUser: true
};

export async function GET(request: Request) {
  const auth = requireDeliveryViewSession(await getCurrentSession());
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const deliveries = await prisma.delivery.findMany({
    where: query
      ? {
          OR: [
            { deliveryNumber: { contains: query, mode: "insensitive" } },
            { order: { orderNumber: { contains: query, mode: "insensitive" } } },
            { order: { customer: { name: { contains: query, mode: "insensitive" } } } },
            { assignedUser: { name: { contains: query, mode: "insensitive" } } },
            { driverName: { contains: query, mode: "insensitive" } }
          ]
        }
      : undefined,
    include: includeDelivery,
    orderBy: { updatedAt: "desc" },
    take: 150
  });

  return NextResponse.json({ deliveries });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  const auth = requireDeliveryManageSession(session);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = deliveryAssignmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the delivery assignment form." }, { status: 400 });
  }

  try {
    const delivery = await prisma.$transaction(async (tx) => {
      const order = await tx.customerOrder.findUnique({ where: { id: parsed.data.orderId } });
      if (!order) throw new Error("ORDER_NOT_FOUND");
      if (["DELIVERED", "CLOSED", "CANCELLED"].includes(order.status)) throw new Error("ORDER_NOT_ASSIGNABLE");

      const created = await tx.delivery.create({
        data: {
          deliveryNumber: generateDeliveryNumber(),
          orderId: order.id,
          routeId: parsed.data.routeId || null,
          zoneId: parsed.data.zoneId || order.deliveryZoneId || null,
          vehicleId: parsed.data.vehicleId || null,
          assignedUserId: parsed.data.assignedUserId || null,
          driverName: parsed.data.driverName?.trim() || null,
          status: "ASSIGNED",
          createdById: session?.user.id
        },
        include: includeDelivery
      });

      await tx.customerOrder.update({
        where: { id: order.id },
        data: { status: "ASSIGNED", deliveryPlaceholder: "Delivery assignment created in Stage 9." }
      });

      await tx.customerOrderHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "ASSIGNED",
          action: "Delivery assigned",
          details: `${created.deliveryNumber} assigned for ${order.orderNumber}.`,
          changedById: session?.user.id
        }
      });

      await tx.deliveryHistory.create({
        data: {
          deliveryId: created.id,
          toStatus: "ASSIGNED",
          action: "Delivery assigned",
          details: `${created.deliveryNumber} assigned to ${created.assignedUser?.name ?? created.driverName ?? "driver placeholder"}.`,
          changedById: session?.user.id
        }
      });

      await tx.auditLog.create({
        data: {
          action: "DELIVERY_ASSIGNED",
          details: `${created.deliveryNumber} assigned for ${order.orderNumber}.`,
          userId: session?.user.id
        }
      });

      await createMockNotification(tx, {
        eventType: "PENDING_DELIVERY_ALERT",
        channel: "PUSH",
        recipientName: created.assignedUser?.name ?? created.driverName ?? "Assigned delivery user",
        recipientContact: created.assignedUser?.email ?? "driver-push-placeholder",
        payload: {
          reference: created.deliveryNumber,
          zone: created.zone?.name ?? created.order.deliveryZone?.name ?? "delivery zone"
        },
        createdById: session?.user.id
      });

      return created;
    });

    return NextResponse.json({ delivery }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const messages: Record<string, string> = {
        ORDER_NOT_FOUND: "Selected order was not found.",
        ORDER_NOT_ASSIGNABLE: "Delivered, closed, or cancelled orders cannot be assigned for delivery."
      };
      if (messages[error.message]) return NextResponse.json({ error: messages[error.message] }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This order already has a delivery assignment." }, { status: 409 });
    }

    throw error;
  }
}
