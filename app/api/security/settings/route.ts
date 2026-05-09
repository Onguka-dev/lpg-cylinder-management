import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { canManageSecurity, canViewSecurity, securitySettingSchema } from "@/lib/security";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) return NextResponse.json({ error: "Sign in to view security settings." }, { status: 401 });
  if (!canViewSecurity(session.user.role)) return NextResponse.json({ error: "Your role cannot view security settings." }, { status: 403 });

  const settings = await prisma.securityControlSetting.findMany({ orderBy: { key: "asc" } });

  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const session = await getCurrentSession();

  if (!session) return NextResponse.json({ error: "Sign in to update security settings." }, { status: 401 });
  if (!canManageSecurity(session.user.role)) return NextResponse.json({ error: "Only Admin can update security settings." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = securitySettingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the security setting." }, { status: 400 });
  }

  const setting = await prisma.securityControlSetting.update({
    where: { key: parsed.data.key },
    data: {
      value: parsed.data.value,
      isEnabled: parsed.data.isEnabled
    }
  });

  await writeAuditLog({
    action: "SECURITY_SETTING_UPDATED",
    category: "SECURITY",
    severity: "WARNING",
    details: `${session.user.email} updated ${setting.label}.`,
    entityType: "SecurityControlSetting",
    entityId: setting.id,
    request,
    session,
    metadata: { key: setting.key, value: setting.value, isEnabled: setting.isEnabled }
  });

  return NextResponse.json({ setting });
}
