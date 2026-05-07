import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import {
  canSendNotifications,
  canViewNotifications,
  createMockNotification,
  notificationCreateSchema
} from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session || !canViewNotifications(session.user.role)) {
    return NextResponse.json({ error: "You are not allowed to view notifications." }, { status: 403 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || undefined;
  const channel = url.searchParams.get("channel") || undefined;
  const eventType = url.searchParams.get("eventType") || undefined;
  const q = url.searchParams.get("q")?.trim();

  const notifications = await prisma.notification.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(channel ? { channel: channel as never } : {}),
      ...(eventType ? { eventType: eventType as never } : {}),
      ...(q ? {
        OR: [
          { reference: { contains: q, mode: "insensitive" } },
          { recipientName: { contains: q, mode: "insensitive" } },
          { recipientContact: { contains: q, mode: "insensitive" } },
          { message: { contains: q, mode: "insensitive" } }
        ]
      } : {})
    },
    include: { template: true, createdBy: { include: { role: true } } },
    orderBy: { createdAt: "desc" },
    take: 150
  });

  return NextResponse.json({ notifications });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || !canSendNotifications(session.user.role)) {
    return NextResponse.json({ error: "You are not allowed to send notification placeholders." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = notificationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the notification form and try again." }, { status: 400 });
  }

  try {
    const notification = await prisma.$transaction(async (tx) => {
      const created = await createMockNotification(tx, {
        ...parsed.data,
        createdById: session.user.id
      });

      await tx.auditLog.create({
        data: {
          action: "NOTIFICATION_MOCK_SENT",
          details: `${created.reference} ${created.status.toLowerCase()} for ${created.recipientContact}.`,
          userId: session.user.id
        }
      });

      return created;
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A generated notification reference already exists. Please try again." }, { status: 409 });
    }
    throw error;
  }
}
