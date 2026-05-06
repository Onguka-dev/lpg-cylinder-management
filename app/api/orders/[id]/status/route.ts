import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { requireOrderStatusSession } from "@/lib/order-access";
import { nextStatuses, orderStatusActionSchema, type OrderStatusKey } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  const auth = requireOrderStatusSession(session);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = orderStatusActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Select a valid order status." }, { status: 400 });
  }

  const existing = await prisma.customerOrder.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const allowed = nextStatuses(existing.status as OrderStatusKey);
  if (!allowed.includes(parsed.data.status)) {
    return NextResponse.json({ error: `Cannot change order from ${existing.status} to ${parsed.data.status}.` }, { status: 400 });
  }

  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.customerOrder.update({
      where: { id: existing.id },
      data: { status: parsed.data.status },
      include: { customer: true, deliveryZone: true, items: { include: { sku: true } } }
    });
    await tx.customerOrderHistory.create({
      data: {
        orderId: existing.id,
        fromStatus: existing.status,
        toStatus: updated.status,
        action: parsed.data.status === "CANCELLED" ? "Order cancelled" : "Order status updated",
        details: parsed.data.notes?.trim() || `${existing.orderNumber} moved to ${updated.status}.`,
        changedById: session?.user.id
      }
    });
    await tx.auditLog.create({
      data: {
        action: "ORDER_STATUS_UPDATED",
        details: `${existing.orderNumber}: ${existing.status} to ${updated.status}.`,
        userId: session?.user.id
      }
    });
    return updated;
  });

  return NextResponse.json({ order });
}
