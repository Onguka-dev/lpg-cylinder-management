import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { canManageIntegrations, canViewIntegrations, integrationSettingSchema } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to view integration settings." }, { status: 401 });
  if (!canViewIntegrations(session.user.role)) return NextResponse.json({ error: "Your role cannot view integration settings." }, { status: 403 });

  const settings = await prisma.integrationSetting.findMany({ orderBy: { providerType: "asc" } });
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to manage integration settings." }, { status: 401 });
  if (!canManageIntegrations(session.user.role)) return NextResponse.json({ error: "Only Admin can manage integration settings." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = integrationSettingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the integration setting." }, { status: 400 });
  }

  const setting = await prisma.integrationSetting.upsert({
    where: { providerType: parsed.data.providerType },
    update: parsed.data,
    create: parsed.data
  });

  await prisma.auditLog.create({
    data: {
      action: "INTEGRATION_SETTING_UPDATED",
      details: `${setting.providerType} integration setting updated.`,
      userId: session.user.id
    }
  });

  return NextResponse.json({ setting });
}
