import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { canManageNotifications, canViewNotifications, notificationTemplateSchema } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getCurrentSession();
  if (!session || !canViewNotifications(session.user.role)) {
    return NextResponse.json({ error: "You are not allowed to view notification templates." }, { status: 403 });
  }

  const templates = await prisma.notificationTemplate.findMany({
    orderBy: [{ eventType: "asc" }, { channel: "asc" }]
  });

  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || !canManageNotifications(session.user.role)) {
    return NextResponse.json({ error: "Only Admin can manage notification templates." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = notificationTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the template form and try again." }, { status: 400 });
  }

  const template = await prisma.notificationTemplate.upsert({
    where: {
      eventType_channel: {
        eventType: parsed.data.eventType,
        channel: parsed.data.channel
      }
    },
    update: parsed.data,
    create: parsed.data
  });

  await prisma.auditLog.create({
    data: {
      action: "NOTIFICATION_TEMPLATE_SAVED",
      details: `${template.name} saved for ${template.channel}.`,
      userId: session.user.id
    }
  });

  return NextResponse.json({ template }, { status: 201 });
}
