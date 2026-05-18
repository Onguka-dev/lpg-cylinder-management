import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { auditCategories, auditSeverities, criticalAuditActions } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (!session) return NextResponse.json({ error: "Sign in to view audit logs." }, { status: 401 });
  if (!["ADMIN", "AUDITOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "Your role cannot view audit logs." }, { status: 403 });
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const severity = url.searchParams.get("severity");
  const q = url.searchParams.get("q")?.trim();
  const critical = url.searchParams.get("critical") === "true";

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(category && auditCategories.includes(category as never) ? { category: category as never } : {}),
      ...(severity && auditSeverities.includes(severity as never) ? { severity: severity as never } : {}),
      ...(critical ? { action: { in: [...criticalAuditActions] } } : {}),
      ...(q ? {
        OR: [
          { action: { contains: q, mode: "insensitive" } },
          { details: { contains: q, mode: "insensitive" } },
          { entityType: { contains: q, mode: "insensitive" } },
          { entityId: { contains: q, mode: "insensitive" } }
        ]
      } : {})
    },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return NextResponse.json({ logs });
}
