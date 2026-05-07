import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { requireOrderManageSession, requireOrderViewSession } from "@/lib/order-access";
import { generateOrderNumber, orderSchema } from "@/lib/orders";
import { createMockNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = requireOrderViewSession(await getCurrentSession());
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const orders = await prisma.customerOrder.findMany({
    where: query ? {
      OR: [
        { orderNumber: { contains: query, mode: "insensitive" } },
        { customer: { name: { contains: query, mode: "insensitive" } } },
        { customer: { phone: { contains: query, mode: "insensitive" } } },
        { deliveryZone: { name: { contains: query, mode: "insensitive" } } }
      ]
    } : undefined,
    include: { customer: true, deliveryZone: true, items: { include: { sku: true } } },
    orderBy: [{ isPriority: "desc" }, { updatedAt: "desc" }],
    take: 150
  });

  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  const auth = requireOrderManageSession(session);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the order form and try again." }, { status: 400 });
  }

  const availability = await checkAvailability(parsed.data.items);
  if (!availability.ok) return NextResponse.json({ error: availability.error }, { status: 400 });

  try {
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.customerOrder.create({
        data: {
          orderNumber: generateOrderNumber(),
          customerId: parsed.data.customerId,
          channel: parsed.data.channel,
          isPriority: parsed.data.isPriority ?? false,
          deliveryZoneId: parsed.data.deliveryZoneId || null,
          expectedDeliveryDate: parsed.data.expectedDeliveryDate ? new Date(parsed.data.expectedDeliveryDate) : null,
          notes: parsed.data.notes?.trim() || null,
          deliveryPlaceholder: "Dispatch and delivery execution are placeholders beyond Stage 7.",
          createdById: session?.user.id,
          items: {
            create: parsed.data.items.map((item) => ({
              skuId: item.skuId,
              quantity: item.quantity,
              notes: item.notes?.trim() || null
            }))
          }
        },
        include: { customer: true, deliveryZone: true, items: { include: { sku: true } } }
      });

      await tx.customerOrderHistory.create({
        data: {
          orderId: created.id,
          toStatus: created.status,
          action: "Order created",
          details: `${created.orderNumber} created with ${created.items.length} line item(s).`,
          changedById: session?.user.id
        }
      });

      await tx.auditLog.create({
        data: {
          action: "ORDER_CREATED",
          details: `${created.orderNumber} created for ${created.customer.name}.`,
          userId: session?.user.id
        }
      });

      await createMockNotification(tx, {
        eventType: "CUSTOMER_ORDER_CONFIRMATION",
        channel: "SMS",
        recipientName: created.customer.name,
        recipientContact: created.customer.phone,
        payload: { reference: created.orderNumber },
        createdById: session?.user.id
      });

      return created;
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A generated order number already exists. Please try again." }, { status: 409 });
    }
    throw error;
  }
}

async function checkAvailability(items: { skuId: string; quantity: number }[]) {
  const totals = new Map<string, number>();
  for (const item of items) totals.set(item.skuId, (totals.get(item.skuId) ?? 0) + item.quantity);

  for (const [skuId, quantity] of Array.from(totals.entries())) {
    const available = await prisma.cylinder.count({ where: { skuId, status: "FILLED" } });
    if (available < quantity) {
      const sku = await prisma.masterDataRecord.findUnique({ where: { id: skuId } });
      return { ok: false, error: `Only ${available} filled ${sku?.name ?? "selected SKU"} cylinder(s) are available for ${quantity} requested.` };
    }
  }

  return { ok: true };
}
