import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { canTriggerIntegrations, generateIntegrationReference, gpsCaptureSchema, mockIntegrationSend } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to capture GPS placeholders." }, { status: 401 });
  if (!canTriggerIntegrations(session.user.role)) return NextResponse.json({ error: "Your role cannot capture GPS placeholders." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = gpsCaptureSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check GPS input." }, { status: 400 });

  const setting = await prisma.integrationSetting.findUnique({ where: { providerType: "MAPS_GPS" } });
  const sendResult = setting?.isEnabled
    ? mockIntegrationSend({ mockFailureRate: setting.mockFailureRate, payload: parsed.data })
    : { ok: false, errorMessage: "Maps/GPS integration setting is disabled." };
  const log = await prisma.integrationLog.create({
    data: {
      reference: generateIntegrationReference(),
      providerType: "MAPS_GPS",
      settingId: setting?.id,
      action: "CAPTURE_GPS_POINT",
      requestStatus: sendResult.ok ? "SUCCESS" : "RETRY_QUEUED",
      responseStatus: sendResult.ok ? "SUCCESS" : "FAILED",
      errorMessage: sendResult.ok ? null : sendResult.errorMessage,
      retryCount: sendResult.ok ? 0 : 1,
      relatedRecord: parsed.data.relatedRecord?.trim() || null,
      payload: parsed.data,
      responsePayload: sendResult.ok ? sendResult.response : { queuedForRetry: true },
      createdById: session.user.id
    }
  });

  return NextResponse.json({ log }, { status: 201 });
}
