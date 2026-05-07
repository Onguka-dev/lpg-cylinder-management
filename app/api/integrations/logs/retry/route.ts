import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { canTriggerIntegrations, mockIntegrationSend } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to retry integration logs." }, { status: 401 });
  if (!canTriggerIntegrations(session.user.role)) return NextResponse.json({ error: "Your role cannot retry integrations." }, { status: 403 });

  const body = await request.json().catch(() => null) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "Select an integration log to retry." }, { status: 400 });

  const existing = await prisma.integrationLog.findUnique({ where: { id: body.id }, include: { setting: true } });
  if (!existing) return NextResponse.json({ error: "Integration log was not found." }, { status: 404 });

  const sendResult = existing.setting?.isEnabled
    ? mockIntegrationSend({ mockFailureRate: 0, payload: existing.payload })
    : { ok: false, errorMessage: "Integration setting is disabled." };

  const log = await prisma.integrationLog.update({
    where: { id: existing.id },
    data: {
      requestStatus: sendResult.ok ? "SUCCESS" : "RETRY_QUEUED",
      responseStatus: sendResult.ok ? "SUCCESS" : "FAILED",
      errorMessage: sendResult.ok ? null : sendResult.errorMessage,
      retryCount: { increment: 1 },
      responsePayload: (sendResult.ok ? sendResult.response : { queuedForRetry: true }) as Prisma.InputJsonValue
    }
  });

  await prisma.auditLog.create({
    data: {
      action: "INTEGRATION_RETRY",
      details: `${log.reference} retried with status ${log.requestStatus}.`,
      userId: session.user.id
    }
  });

  return NextResponse.json({ log });
}
