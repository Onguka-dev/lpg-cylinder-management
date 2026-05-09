import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { canManageSecurity } from "@/lib/security";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Sign in to view sessions." }, { status: 401 });
  }

  const where = canManageSecurity(session.user.role) ? {} : { userId: session.user.id };
  const sessions = await prisma.userSession.findMany({
    where,
    include: { user: { include: { role: true } } },
    orderBy: { lastSeenAt: "desc" },
    take: 100
  });

  return NextResponse.json({
    currentSessionId: session.sessionId,
    sessions
  });
}

export async function DELETE(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Sign in to revoke a session." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { sessionTokenId?: string } | null;
  const sessionTokenId = body?.sessionTokenId?.trim();

  if (!sessionTokenId) {
    return NextResponse.json({ error: "Select a session to revoke." }, { status: 400 });
  }

  const target = await prisma.userSession.findUnique({ where: { sessionTokenId } });

  if (!target) {
    return NextResponse.json({ error: "Session was not found." }, { status: 404 });
  }

  if (!canManageSecurity(session.user.role) && target.userId !== session.user.id) {
    return NextResponse.json({ error: "Your role cannot revoke another user's session." }, { status: 403 });
  }

  await prisma.userSession.update({
    where: { sessionTokenId },
    data: { status: "REVOKED", revokedAt: new Date() }
  });

  await writeAuditLog({
    action: "SESSION_REVOKED",
    category: "SECURITY",
    severity: "WARNING",
    details: `${session.user.email} revoked session ${sessionTokenId}.`,
    entityType: "UserSession",
    entityId: sessionTokenId,
    request,
    session
  });

  return NextResponse.json({ ok: true });
}
