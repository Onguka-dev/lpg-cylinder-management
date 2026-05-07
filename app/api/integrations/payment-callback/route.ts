import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { generateIntegrationReference, mockIntegrationSend } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";

const paymentCallbackSchema = z.object({
  provider: z.enum(["MPESA", "CARD", "ONLINE"]),
  transactionReference: z.string().trim().min(3, "Transaction reference is required.").max(120),
  amount: z.coerce.number().positive("Callback amount must be greater than zero."),
  relatedRecord: z.string().trim().max(120).optional().nullable(),
  status: z.enum(["SUCCESS", "FAILED"]).default("SUCCESS")
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = paymentCallbackSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check payment callback payload." }, { status: 400 });

  const setting = await prisma.integrationSetting.findUnique({ where: { providerType: "PAYMENT_GATEWAY" } });
  const sendResult = setting?.isEnabled
    ? mockIntegrationSend({ forceFailure: parsed.data.status === "FAILED", mockFailureRate: setting.mockFailureRate, payload: parsed.data })
    : { ok: false, errorMessage: "Payment gateway integration setting is disabled." };

  const log = await prisma.integrationLog.create({
    data: {
      reference: generateIntegrationReference(),
      providerType: "PAYMENT_GATEWAY",
      settingId: setting?.id,
      action: "PAYMENT_CALLBACK",
      requestStatus: sendResult.ok ? "SUCCESS" : "RETRY_QUEUED",
      responseStatus: sendResult.ok ? "SUCCESS" : "FAILED",
      errorMessage: sendResult.ok ? null : sendResult.errorMessage,
      retryCount: sendResult.ok ? 0 : 1,
      relatedRecord: parsed.data.relatedRecord?.trim() || parsed.data.transactionReference,
      payload: parsed.data as Prisma.InputJsonValue,
      responsePayload: (sendResult.ok ? sendResult.response : { queuedForRetry: true }) as Prisma.InputJsonValue
    }
  });

  return NextResponse.json({ log }, { status: 202 });
}
