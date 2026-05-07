import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { canManageNotifications, canViewNotifications, notificationSettingSchema } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getCurrentSession();
  if (!session || !canViewNotifications(session.user.role)) {
    return NextResponse.json({ error: "You are not allowed to view notification settings." }, { status: 403 });
  }

  const settings = await prisma.notificationChannelSetting.findMany({
    orderBy: { channel: "asc" }
  });

  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const session = await getCurrentSession();
  if (!session || !canManageNotifications(session.user.role)) {
    return NextResponse.json({ error: "Only Admin can manage notification settings." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = notificationSettingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the notification setting form and try again." }, { status: 400 });
  }

  const setting = await prisma.notificationChannelSetting.upsert({
    where: { channel: parsed.data.channel },
    update: parsed.data,
    create: parsed.data
  });

  await prisma.auditLog.create({
    data: {
      action: "NOTIFICATION_CHANNEL_SETTING_UPDATED",
      details: `${setting.channel} notifications ${setting.isEnabled ? "enabled" : "disabled"}.`,
      userId: session.user.id
    }
  });

  return NextResponse.json({ setting });
}
