import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { reconciliationOverrideSchema } from "@/lib/reconciliations";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to override reconciliations." }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Only Admin can override approved reconciliations." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = reconciliationOverrideSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the override form and try again." }, { status: 400 });
  }

  const reconciliation = await prisma.dailyReconciliation.findUnique({ where: { id: params.id } });
  if (!reconciliation) return NextResponse.json({ error: "Reconciliation not found." }, { status: 404 });
  if (!["APPROVED", "CLOSED"].includes(reconciliation.status)) {
    return NextResponse.json({ error: "Admin override is only available after approval or closure locks the reconciliation." }, { status: 400 });
  }

  const actualCash = new Prisma.Decimal(parsed.data.actualCash).toDecimalPlaces(2);
  const paymentVariance = actualCash.minus(reconciliation.expectedCash).toDecimalPlaces(2);
  const stockVariance = parsed.data.actualClosingStock - reconciliation.expectedClosingStock;

  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.dailyReconciliation.update({
      where: { id: reconciliation.id },
      data: {
        actualClosingStock: parsed.data.actualClosingStock,
        stockVariance,
        stockExplanation: parsed.data.stockExplanation?.trim() || null,
        actualCash,
        paymentVariance,
        paymentExplanation: parsed.data.paymentExplanation?.trim() || null,
        adminOverrideReason: parsed.data.adminOverrideReason.trim(),
        lockedAt: reconciliation.lockedAt ?? new Date()
      }
    });
    await tx.auditLog.create({
      data: {
        action: "RECONCILIATION_ADMIN_OVERRIDE",
        category: "RECONCILIATION",
        severity: "WARNING",
        entityType: "DailyReconciliation",
        entityId: reconciliation.id,
        details: `${reconciliation.reference} overridden by Admin: ${parsed.data.adminOverrideReason.trim()}`,
        userId: session.user.id
      }
    });
    return saved;
  });

  return NextResponse.json({ reconciliation: updated });
}
