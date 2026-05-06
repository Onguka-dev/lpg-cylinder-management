import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { requireOrderManageSession, requireOrderViewSession } from "@/lib/order-access";
import { canModifyOrderStatus, orderSchema } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = requireOrderViewSession(await getCurrentSession());
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const order = await prisma.customerOrder.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      deliveryZone: true,
      createdBy: true,
      items: { include: { sku: true }, orderBy: { createdAt: "asc" } },
      historyEntries: { include: { changedBy: true }, orderBy: { createdAt: "desc" } }
    }
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  return NextResponse.json({ order });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  const auth = requireOrderManageSession(session);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const existing = await prisma.customerOrder.findUnique({ where: { id: params.id }, include: { items: true } });
  if (!existing) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (!canModifyOrderStatus(existing.status)) {
    return NextResponse.json({ error: "Orders cannot be modified after dispatch." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the order form and try again." }, { status: 400 });
  }

  const order = await prisma.$transaction(async (tx) => {
    await tx.customerOrderItem.deleteMany({ where: { orderId: existing.id } });
    const updated = await tx.customerOrder.update({
      where: { id: existing.id },
      data: {
        customerId: parsed.data.customerId,
        channel: parsed.data.channel,
        isPriority: parsed.data.isPriority ?? false,
        deliveryZoneId: parsed.data.deliveryZoneId || null,
        expectedDeliveryDate: parsed.data.expectedDeliveryDate ? new Date(parsed.data.expectedDeliveryDate) : null,
        notes: parsed.data.notes?.trim() || null,
        items: { create: parsed.data.items.map((item) => ({ skuId: item.skuId, quantity: item.quantity, notes: item.notes?.trim() || null })) }
      },
      include: { customer: true, deliveryZone: true, items: { include: { sku: true } } }
    });
    await tx.customerOrderHistory.create({
      data: {
        orderId: updated.id,
        fromStatus: existing.status,
        toStatus: updated.status,
        action: "Order modified",
        details: `${updated.orderNumber} modified before dispatch.`,
        changedById: session?.user.id
      }
    });
    return updated;
  });

  return NextResponse.json({ order });
}
