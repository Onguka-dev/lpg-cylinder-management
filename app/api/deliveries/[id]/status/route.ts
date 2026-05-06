import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import {
  deliveryStatusSchema,
  nextDeliveryStatuses,
  orderStatusForDelivery,
  type DeliveryStatusKey
} from "@/lib/deliveries";
import { requireDeliveryStatusSession } from "@/lib/delivery-access";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  const auth = requireDeliveryStatusSession(session);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = deliveryStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the delivery status form." }, { status: 400 });
  }

  const existing = await prisma.delivery.findUnique({ where: { id: params.id }, include: { order: true } });
  if (!existing) return NextResponse.json({ error: "Delivery not found." }, { status: 404 });

  const allowed = nextDeliveryStatuses(existing.status as DeliveryStatusKey);
  if (!allowed.includes(parsed.data.status)) {
    return NextResponse.json({ error: `Cannot change delivery from ${existing.status} to ${parsed.data.status}.` }, { status: 400 });
  }

  const now = new Date();
  const nextOrderStatus = orderStatusForDelivery(parsed.data.status);
  const delivery = await prisma.$transaction(async (tx) => {
    const updated = await tx.delivery.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.status,
        failedReason: parsed.data.failedReason ?? null,
        otp: parsed.data.otp?.trim() || existing.otp,
        signaturePlaceholder: parsed.data.signaturePlaceholder?.trim() || existing.signaturePlaceholder,
        photoPlaceholder: parsed.data.photoPlaceholder?.trim() || existing.photoPlaceholder,
        gpsLatitude: parsed.data.gpsLatitude ?? existing.gpsLatitude,
        gpsLongitude: parsed.data.gpsLongitude ?? existing.gpsLongitude,
        customerRemarks: parsed.data.customerRemarks?.trim() || existing.customerRemarks,
        exceptionNotes: parsed.data.exceptionNotes?.trim() || existing.exceptionNotes,
        loadingConfirmedAt: parsed.data.status === "LOADING_CONFIRMED" ? now : existing.loadingConfirmedAt,
        customerArrivedAt: parsed.data.status === "CUSTOMER_ARRIVAL" ? now : existing.customerArrivedAt,
        deliveredAt: parsed.data.status === "DELIVERED" ? now : existing.deliveredAt,
        failedAt: ["FAILED", "EXCEPTION"].includes(parsed.data.status) ? now : existing.failedAt,
        returnedAt: parsed.data.status === "RETURNED" ? now : existing.returnedAt
      },
      include: {
        order: { include: { customer: true, deliveryZone: true, items: { include: { sku: true } } } },
        route: true,
        zone: true,
        vehicle: true,
        assignedUser: true,
        historyEntries: { include: { changedBy: true }, orderBy: { createdAt: "desc" } }
      }
    });

    if (existing.order.status !== nextOrderStatus) {
      await tx.customerOrder.update({
        where: { id: existing.orderId },
        data: { status: nextOrderStatus }
      });
      await tx.customerOrderHistory.create({
        data: {
          orderId: existing.orderId,
          fromStatus: existing.order.status,
          toStatus: nextOrderStatus,
          action: "Delivery status updated",
          details: `${existing.deliveryNumber} moved order to ${nextOrderStatus}.`,
          changedById: session?.user.id
        }
      });
    }

    await tx.deliveryHistory.create({
      data: {
        deliveryId: existing.id,
        fromStatus: existing.status,
        toStatus: updated.status,
        action: "Delivery status updated",
        details: deliveryDetails(parsed.data.status, parsed.data.failedReason ?? undefined),
        changedById: session?.user.id
      }
    });

    await tx.auditLog.create({
      data: {
        action: "DELIVERY_STATUS_UPDATED",
        details: `${existing.deliveryNumber}: ${existing.status} to ${updated.status}.`,
        userId: session?.user.id
      }
    });

    return updated;
  });

  return NextResponse.json({ delivery });
}

function deliveryDetails(status: DeliveryStatusKey, failedReason?: string) {
  if (failedReason) return `${status} with reason ${failedReason}.`;
  return `Delivery moved to ${status}.`;
}
