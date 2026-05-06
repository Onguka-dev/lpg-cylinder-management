import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { requireReconciliationReviewSession } from "@/lib/reconciliation-access";
import { reconciliationReviewSchema } from "@/lib/reconciliations";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  const auth = requireReconciliationReviewSession(session);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = reconciliationReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Choose a review action." }, { status: 400 });
  }

  const reconciliation = await prisma.dailyReconciliation.findUnique({ where: { id: params.id } });
  if (!reconciliation) return NextResponse.json({ error: "Reconciliation not found." }, { status: 404 });
  if (reconciliation.status !== "SUBMITTED") {
    return NextResponse.json({ error: "Only submitted reconciliations can be approved or returned." }, { status: 400 });
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.dailyReconciliation.update({
      where: { id: reconciliation.id },
      data: {
        status: parsed.data.status,
        supervisorNotes: parsed.data.supervisorNotes?.trim() || null,
        reviewedById: auth.session.user.id,
        approvedAt: parsed.data.status === "APPROVED" ? now : null,
        returnedAt: parsed.data.status === "RETURNED" ? now : null,
        lockedAt: parsed.data.status === "APPROVED" ? now : null
      }
    });
    await tx.auditLog.create({
      data: {
        action: parsed.data.status === "APPROVED" ? "RECONCILIATION_APPROVED" : "RECONCILIATION_RETURNED",
        details: `${reconciliation.reference} ${parsed.data.status.toLowerCase()}.`,
        userId: auth.session.user.id
      }
    });
    return saved;
  });

  return NextResponse.json({ reconciliation: updated });
}
