import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import {
  canTriggerIntegrations,
  canViewIntegrations,
  generateIntegrationReference,
  integrationLogSchema,
  mockIntegrationSend
} from "@/lib/integrations";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to view integration logs." }, { status: 401 });
  if (!canViewIntegrations(session.user.role)) return NextResponse.json({ error: "Your role cannot view integration logs." }, { status: 403 });

  const url = new URL(request.url);
  const providerType = url.searchParams.get("providerType") || undefined;
  const status = url.searchParams.get("status") || undefined;

  const logs = await prisma.integrationLog.findMany({
    where: {
      ...(providerType ? { providerType: providerType as never } : {}),
      ...(status ? { requestStatus: status as never } : {})
    },
    include: { setting: true, createdBy: true },
    orderBy: { createdAt: "desc" },
    take: 150
  });

  return NextResponse.json({ logs });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to trigger mock integrations." }, { status: 401 });
  if (!canTriggerIntegrations(session.user.role)) return NextResponse.json({ error: "Your role cannot trigger integrations." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = integrationLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the integration request." }, { status: 400 });
  }

  try {
    const log = await prisma.$transaction(async (tx) => {
      const setting = await tx.integrationSetting.findUnique({ where: { providerType: parsed.data.providerType } });
      const sendResult = setting?.isEnabled
        ? mockIntegrationSend({
            forceFailure: parsed.data.forceFailure,
            mockFailureRate: setting.mockFailureRate,
            payload: parsed.data.payload
          })
        : { ok: false, errorMessage: "Integration setting is disabled." };
      const requestStatus = sendResult.ok ? "SUCCESS" : "RETRY_QUEUED";

      const created = await tx.integrationLog.create({
        data: {
          reference: generateIntegrationReference(),
          providerType: parsed.data.providerType,
          settingId: setting?.id,
          action: parsed.data.action,
          requestStatus,
          responseStatus: sendResult.ok ? "SUCCESS" : "FAILED",
          errorMessage: sendResult.ok ? null : sendResult.errorMessage,
          retryCount: sendResult.ok ? 0 : 1,
          relatedRecord: parsed.data.relatedRecord?.trim() || null,
          payload: (parsed.data.payload ?? {}) as Prisma.InputJsonValue,
          responsePayload: (sendResult.ok ? sendResult.response : { queuedForRetry: true }) as Prisma.InputJsonValue,
          createdById: session.user.id
        }
      });

      await tx.auditLog.create({
        data: {
          action: "INTEGRATION_MOCK_ATTEMPT",
          details: `${created.reference} ${created.requestStatus.toLowerCase()} for ${created.providerType}.`,
          userId: session.user.id
        }
      });

      return created;
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A generated integration reference already exists. Please try again." }, { status: 409 });
    }
    throw error;
  }
}
