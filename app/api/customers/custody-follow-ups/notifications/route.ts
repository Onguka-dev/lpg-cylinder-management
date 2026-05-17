import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { canCreateRefillFollowUpReminders } from "@/lib/customer-custody-intelligence";
import { createMockNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to create refill follow-up reminders." }, { status: 401 });
  if (!canCreateRefillFollowUpReminders(session.user.role)) return NextResponse.json({ error: "Your role cannot create refill follow-up reminders." }, { status: 403 });

  const body = await request.json().catch(() => ({})) as { filter?: string };
  const now = new Date();
  const lookAhead = new Date(now);
  lookAhead.setDate(lookAhead.getDate() + 7);
  const where = body.filter === "OVERDUE_CYLINDERS"
    ? { returnDate: null, expectedReturnFollowUpDate: { lt: now } }
    : { returnDate: null, expectedReturnFollowUpDate: { gte: now, lte: lookAhead } };

  const custodies = await prisma.customerCylinderCustody.findMany({
    where,
    include: { customer: true, cylinder: { include: { sku: true } }, issueLocation: true },
    orderBy: { expectedReturnFollowUpDate: "asc" },
    take: 100
  });

  const notifications = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const custody of custodies) {
      const reference = custody.refillReference ?? custody.saleReference ?? custody.id;
      const existing = await tx.notification.findFirst({
        where: {
          eventType: "REFILL_FOLLOW_UP",
          recipientContact: custody.customer.phone,
          payload: { path: ["custodyId"], equals: custody.id }
        }
      });
      if (existing) continue;

      created.push(await createMockNotification(tx, {
        eventType: "REFILL_FOLLOW_UP",
        channel: "SMS",
        recipientName: custody.customer.name,
        recipientContact: custody.customer.phone,
        payload: {
          custodyId: custody.id,
          reference,
          customer: custody.customer.name,
          cylinder: custody.cylinder.barcode ?? custody.cylinder.serialNumber,
          sku: custody.cylinder.sku.name,
          dueDate: custody.expectedReturnFollowUpDate?.toISOString().slice(0, 10) ?? "",
          sellingPoint: custody.issueLocation?.name ?? ""
        },
        createdById: session.user.id
      }));
    }
    return created;
  });

  return NextResponse.json({ created: notifications.length });
}
