import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { canManageNotifications, notificationTemplateSchema } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (!session || !canManageNotifications(session.user.role)) {
    return NextResponse.json({ error: "Only Admin can manage notification templates." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = notificationTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the template form and try again." }, { status: 400 });
  }

  const template = await prisma.notificationTemplate.update({
    where: { id: params.id },
    data: parsed.data
  });

  await prisma.auditLog.create({
    data: {
      action: "NOTIFICATION_TEMPLATE_UPDATED",
      details: `${template.name} updated for ${template.channel}.`,
      userId: session.user.id
    }
  });

  return NextResponse.json({ template });
}
