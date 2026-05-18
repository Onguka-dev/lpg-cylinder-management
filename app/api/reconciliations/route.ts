import { NextResponse } from "next/server";
import { Prisma, RoleName } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { requireReconciliationCreateSession, requireReconciliationViewSession } from "@/lib/reconciliation-access";
import {
  actualClosingFromCountLines,
  buildReconciliationCountLines,
  buildReconciliationVarianceCases,
  calculateReconciliationSummary,
  generateReconciliationReference,
  reconciliationCreateSchema
} from "@/lib/reconciliations";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = requireReconciliationViewSession(await getCurrentSession());
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status")?.trim();
  const scope = url.searchParams.get("scope")?.trim();
  const ownOnly = ["RSO", "MSO", "SERVICE_CENTRE_STAFF"].includes(auth.session.user.role);

  const reconciliations = await prisma.dailyReconciliation.findMany({
    where: {
      ...(ownOnly ? { ownerId: auth.session.user.id } : {}),
      ...(status ? { status: status as never } : {}),
      ...(scope ? { scope: scope as never } : {}),
      ...(query
        ? {
            OR: [
              { reference: { contains: query, mode: "insensitive" } },
              { owner: { name: { contains: query, mode: "insensitive" } } },
              { location: { name: { contains: query, mode: "insensitive" } } }
            ]
          }
        : {})
    },
    include: { owner: { include: { role: true } }, location: true, reviewedBy: true },
    orderBy: [{ reconciliationDate: "desc" }, { updatedAt: "desc" }],
    take: 150
  });

  return NextResponse.json({ reconciliations });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  const auth = requireReconciliationCreateSession(session);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = reconciliationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the reconciliation form and try again." }, { status: 400 });
  }

  const owner = await prisma.user.findUnique({
    where: { id: parsed.data.ownerId },
    include: { role: true }
  });
  if (!owner) return NextResponse.json({ error: "Select a valid accountable user." }, { status: 400 });

  const roleScope: Partial<Record<RoleName, string>> = {
    RSO: "RSO",
    MSO: "MSO",
    WAREHOUSE_MANAGER: "WAREHOUSE",
    SERVICE_CENTRE_STAFF: "SERVICE_CENTRE"
  };
  if (roleScope[owner.role.name] !== parsed.data.scope) {
    return NextResponse.json({ error: "The selected user does not match the reconciliation scope." }, { status: 400 });
  }

  if (["RSO", "MSO", "SERVICE_CENTRE_STAFF"].includes(auth.session.user.role) && owner.id !== auth.session.user.id) {
    return NextResponse.json({ error: "Sales and service centre users can only create their own close-of-day reconciliation." }, { status: 403 });
  }
  if (auth.session.user.role === "RSO" && parsed.data.scope !== "RSO") {
    return NextResponse.json({ error: "RSO users can only create RSO reconciliations." }, { status: 403 });
  }
  if (auth.session.user.role === "MSO" && parsed.data.scope !== "MSO") {
    return NextResponse.json({ error: "MSO users can only create MSO reconciliations." }, { status: 403 });
  }
  if (auth.session.user.role === "SERVICE_CENTRE_STAFF" && parsed.data.scope !== "SERVICE_CENTRE") {
    return NextResponse.json({ error: "Service centre users can only create service centre reconciliations." }, { status: 403 });
  }

  const summary = await calculateReconciliationSummary({
    ownerId: parsed.data.ownerId,
    scope: parsed.data.scope,
    date: parsed.data.reconciliationDate
  });
  const actualCash = new Prisma.Decimal(parsed.data.actualCash).toDecimalPlaces(2);
  const paymentVariance = actualCash.minus(summary.expectedCash).toDecimalPlaces(2);
  const countLines = await buildReconciliationCountLines({
    locationId: summary.location?.id ?? null,
    countLines: parsed.data.countLines
  });
  const actualClosingStock = actualClosingFromCountLines(parsed.data.actualClosingStock, countLines);
  const stockVariance = actualClosingStock - summary.expectedClosingStock;

  try {
    const reconciliation = await prisma.$transaction(async (tx) => {
      const created = await tx.dailyReconciliation.create({
        data: {
          reference: generateReconciliationReference(parsed.data.scope),
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
          actualClosingStock,
          stockVariance,
          stockExplanation: parsed.data.stockExplanation?.trim() || null,
          cashCollections: summary.cashCollections,
          mpesaCollections: summary.mpesaCollections,
          cardCollections: summary.cardCollections,
          expectedCash: summary.expectedCash,
          actualCash,
          paymentVariance,
          paymentExplanation: parsed.data.paymentExplanation?.trim() || null,
          createdById: auth.session.user.id
        },
        include: { owner: true, location: true }
      });

      if (countLines.length) {
        await tx.reconciliationCountLine.createMany({
          data: countLines.map((line) => ({
            reconciliationId: created.id,
            skuId: line.skuId,
            status: line.status,
            systemCount: line.systemCount,
            actualCount: line.actualCount,
            scannedCount: line.scannedCount,
            variance: line.variance,
            countMode: line.countMode,
            notes: line.notes
          }))
        });
      }

      await tx.auditLog.create({
        data: {
          action: "RECONCILIATION_CREATED",
          category: "RECONCILIATION",
          entityType: "DailyReconciliation",
          entityId: created.id,
          details: `${created.reference} created for ${owner.name}.`,
          userId: auth.session.user.id
        }
      });

      return created;
    });

    const varianceCases = await buildReconciliationVarianceCases({
      reconciliationId: reconciliation.id,
      locationId: reconciliation.locationId,
      date: reconciliation.reconciliationDate,
      stockVariance,
      paymentVariance,
      countLines,
      createdById: auth.session.user.id
    });
    if (varianceCases.length) {
      await prisma.reconciliationVarianceCase.createMany({ data: varianceCases, skipDuplicates: true });
      await prisma.auditLog.create({
        data: {
          action: "RECONCILIATION_VARIANCE_CASES_CREATED",
          category: "RECONCILIATION",
          severity: "WARNING",
          entityType: "DailyReconciliation",
          entityId: reconciliation.id,
          details: `${varianceCases.length} variance case(s) created for ${reconciliation.reference}.`,
          userId: auth.session.user.id
        }
      });
    }

    return NextResponse.json({ reconciliation }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A reconciliation already exists for this user, scope, and date." }, { status: 409 });
    }
    throw error;
  }
}
