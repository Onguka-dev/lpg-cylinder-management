import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { requireReconciliationCreateSession } from "@/lib/reconciliation-access";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  const auth = requireReconciliationCreateSession(session);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const reconciliation = await prisma.dailyReconciliation.findUnique({ where: { id: params.id }, include: { owner: true } });
  if (!reconciliation) return NextResponse.json({ error: "Reconciliation not found." }, { status: 404 });
  if (!["DRAFT", "RETURNED"].includes(reconciliation.status)) {
    return NextResponse.json({ error: "Only draft or returned reconciliations can be submitted." }, { status: 400 });
  }
  if (["RSO", "MSO"].includes(auth.session.user.role) && reconciliation.ownerId !== auth.session.user.id) {
    return NextResponse.json({ error: "You can only submit your own reconciliation." }, { status: 403 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.dailyReconciliation.update({
      where: { id: reconciliation.id },
      data: { status: "SUBMITTED", submittedAt: new Date() }
    });
    await tx.auditLog.create({
      data: {
        action: "RECONCILIATION_SUBMITTED",
        details: `${reconciliation.reference} submitted for supervisor review.`,
        userId: auth.session.user.id
      }
    });
    return saved;
  });

  return NextResponse.json({ reconciliation: updated });
}
