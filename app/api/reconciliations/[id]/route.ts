import { NextResponse } from "next/server";
import { Prisma, RoleName } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { requireReconciliationCreateSession, requireReconciliationViewSession } from "@/lib/reconciliation-access";
import { calculateReconciliationSummary, reconciliationCreateSchema } from "@/lib/reconciliations";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = requireReconciliationViewSession(await getCurrentSession());
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const reconciliation = await prisma.dailyReconciliation.findUnique({
    where: { id: params.id },
    include: { owner: { include: { role: true } }, location: true, createdBy: true, reviewedBy: true }
  });
  if (!reconciliation) return NextResponse.json({ error: "Reconciliation not found." }, { status: 404 });
  if (["RSO", "MSO"].includes(auth.session.user.role) && reconciliation.ownerId !== auth.session.user.id) {
    return NextResponse.json({ error: "You can only view your own reconciliation." }, { status: 403 });
  }

  return NextResponse.json({ reconciliation });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  const auth = requireReconciliationCreateSession(session);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const reconciliation = await prisma.dailyReconciliation.findUnique({ where: { id: params.id } });
  if (!reconciliation) return NextResponse.json({ error: "Reconciliation not found." }, { status: 404 });
  if (!["DRAFT", "RETURNED"].includes(reconciliation.status)) {
    return NextResponse.json({ error: "Only draft or returned reconciliations can be edited. Approved reconciliations require Admin override." }, { status: 400 });
  }
  if (["RSO", "MSO"].includes(auth.session.user.role) && reconciliation.ownerId !== auth.session.user.id) {
    return NextResponse.json({ error: "You can only edit your own reconciliation." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = reconciliationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the reconciliation form and try again." }, { status: 400 });
  }

  const owner = await prisma.user.findUnique({ where: { id: parsed.data.ownerId }, include: { role: true } });
  if (!owner) return NextResponse.json({ error: "Select a valid accountable user." }, { status: 400 });

  const roleScope: Partial<Record<RoleName, string>> = {
    RSO: "RSO",
    MSO: "MSO",
    WAREHOUSE_MANAGER: "WAREHOUSE"
  };
  if (roleScope[owner.role.name] !== parsed.data.scope) {
    return NextResponse.json({ error: "The selected user does not match the reconciliation scope." }, { status: 400 });
  }
  if (["RSO", "MSO"].includes(auth.session.user.role) && owner.id !== auth.session.user.id) {
    return NextResponse.json({ error: "RSO and MSO users can only edit their own reconciliation." }, { status: 403 });
  }

  const summary = await calculateReconciliationSummary({
    ownerId: owner.id,
    scope: parsed.data.scope,
    date: parsed.data.reconciliationDate
  });
  const actualCash = new Prisma.Decimal(parsed.data.actualCash).toDecimalPlaces(2);
  const paymentVariance = actualCash.minus(summary.expectedCash).toDecimalPlaces(2);
  const stockVariance = parsed.data.actualClosingStock - summary.expectedClosingStock;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.dailyReconciliation.update({
        where: { id: reconciliation.id },
        data: {
          reconciliationDate: new Date(parsed.data.reconciliationDate),
          scope: parsed.data.scope,
          ownerId: owner.id,
          locationId: summary.location?.id ?? null,
          openingStock: summary.openingStock,
          goodsReceived: summary.goodsReceived,
          salesIssues: summary.salesIssues,
          transfers: summary.transfers,
          returns: summary.returns,
          damagedCylinders: summary.damagedCylinders,
          expectedClosingStock: summary.expectedClosingStock,
          actualClosingStock: parsed.data.actualClosingStock,
          stockVariance,
          stockExplanation: parsed.data.stockExplanation?.trim() || null,
          cashCollections: summary.cashCollections,
          mpesaCollections: summary.mpesaCollections,
          cardCollections: summary.cardCollections,
          expectedCash: summary.expectedCash,
          actualCash,
          paymentVariance,
          paymentExplanation: parsed.data.paymentExplanation?.trim() || null,
          status: "DRAFT",
          supervisorNotes: null,
          reviewedById: null,
          returnedAt: null
        }
      });
      await tx.auditLog.create({
        data: {
          action: "RECONCILIATION_UPDATED",
          details: `${reconciliation.reference} updated before approval.`,
          userId: auth.session.user.id
        }
      });
      return saved;
    });

    return NextResponse.json({ reconciliation: updated });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A reconciliation already exists for this user, scope, and date." }, { status: 409 });
    }
    throw error;
  }
}
