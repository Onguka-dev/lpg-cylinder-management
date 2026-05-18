import { z } from "zod";
import { Prisma } from "@prisma/client";
import type { AppRole } from "@/lib/auth-types";
import { prisma } from "@/lib/prisma";

export const reconciliationScopes = ["RSO", "MSO", "WAREHOUSE", "SERVICE_CENTRE"] as const;
export const reconciliationStatuses = ["DRAFT", "SUBMITTED", "APPROVED", "RETURNED", "CLOSED"] as const;
export const reconciliationCountModes = ["SUMMARY", "SCAN"] as const;
export const reconciliationVarianceTypes = ["MISSING", "EXTRA", "DUPLICATE", "WRONG_LOCATION", "WRONG_STATUS", "OVERDUE_IN_TRANSIT", "STOCK_VARIANCE", "PAYMENT_VARIANCE"] as const;
export const reconciliationVarianceStatuses = ["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"] as const;

export const reconciliationCountStatuses = [
  "FILLED_AT_WAREHOUSE",
  "FILLED_AT_SELLING_POINT",
  "EMPTY_AT_WAREHOUSE",
  "EMPTY_AT_SELLING_POINT",
  "WITH_CUSTOMER",
  "IN_TRANSIT",
  "EMPTY_IN_TRANSIT",
  "FILLED_IN_TRANSIT",
  "DAMAGED",
  "QUARANTINED",
  "LOST_OVERDUE"
] as const;

const countLineSchema = z.object({
  skuId: z.string().min(1),
  status: z.enum(reconciliationCountStatuses),
  actualCount: z.coerce.number().int().nonnegative("Physical count cannot be negative."),
  scannedCount: z.coerce.number().int().nonnegative("Scan count cannot be negative.").optional().nullable(),
  countMode: z.enum(reconciliationCountModes).default("SUMMARY"),
  notes: z.string().trim().max(240, "Count notes must be 240 characters or fewer.").optional().nullable()
});

export const reconciliationCreateSchema = z.object({
  reconciliationDate: z.string().min(1, "Select a reconciliation date."),
  scope: z.enum(reconciliationScopes),
  ownerId: z.string().min(1, "Select the accountable user."),
  actualClosingStock: z.coerce.number().int().nonnegative("Actual closing stock cannot be negative.").optional().nullable(),
  actualCash: z.coerce.number().nonnegative("Actual cash cannot be negative."),
  stockExplanation: z.string().trim().max(500, "Stock explanation must be 500 characters or fewer.").optional().nullable(),
  paymentExplanation: z.string().trim().max(500, "Payment explanation must be 500 characters or fewer.").optional().nullable(),
  countLines: z.array(countLineSchema).optional().default([])
});

export const reconciliationReviewSchema = z.object({
  status: z.enum(["APPROVED", "RETURNED", "CLOSED"]),
  supervisorNotes: z.string().trim().max(500, "Supervisor notes must be 500 characters or fewer.").optional().nullable()
});

export const reconciliationOverrideSchema = z.object({
  actualClosingStock: z.coerce.number().int().nonnegative("Actual closing stock cannot be negative."),
  actualCash: z.coerce.number().nonnegative("Actual cash cannot be negative."),
  stockExplanation: z.string().trim().max(500, "Stock explanation must be 500 characters or fewer.").optional().nullable(),
  paymentExplanation: z.string().trim().max(500, "Payment explanation must be 500 characters or fewer.").optional().nullable(),
  adminOverrideReason: z.string().trim().min(5, "Admin override reason must be at least 5 characters.").max(500, "Admin override reason must be 500 characters or fewer.")
});

export function canViewReconciliations(role: AppRole) {
  return ["ADMIN", "WAREHOUSE_MANAGER", "PLANT_MANAGER", "RSO", "MSO", "SERVICE_CENTRE_STAFF", "FINANCE_SAP_REVIEWER", "AUDITOR"].includes(role);
}

export function canCreateReconciliations(role: AppRole) {
  return ["ADMIN", "WAREHOUSE_MANAGER", "PLANT_MANAGER", "RSO", "MSO", "SERVICE_CENTRE_STAFF"].includes(role);
}

export function canReviewReconciliations(role: AppRole) {
  return ["ADMIN", "WAREHOUSE_MANAGER", "PLANT_MANAGER", "FINANCE_SAP_REVIEWER"].includes(role);
}

export function canAdminOverrideReconciliation(role: AppRole) {
  return role === "ADMIN";
}

export function formatReconciliationLabel(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function generateReconciliationReference(scope: string) {
  const now = new Date();
  return `REC-${scope}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}${String(now.getMilliseconds()).padStart(3, "0")}`;
}

export function generateVarianceCaseReference(type: string, index: number) {
  const now = new Date();
  return `VAR-${type}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}${String(now.getMilliseconds()).padStart(3, "0")}-${index}`;
}

export function dayRange(dateValue: string | Date) {
  const start = new Date(dateValue);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function calculateReconciliationSummary({ ownerId, scope, date }: { ownerId: string; scope: string; date: string | Date }) {
  const { start, end } = dayRange(date);
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, include: { location: true } });
  const location = owner?.location ? await prisma.masterDataRecord.findFirst({ where: { code: owner.location.code } }) : null;
  const locationId = location?.id ?? null;

  const whereLocation = locationId ? { currentLocationId: locationId } : {};
  const [closingStock, damagedCylinders, receipts, transfersIn, transfersOut, returned, fieldSales, refillSales, fullCylinderSales, payments] = await Promise.all([
    prisma.cylinder.count({ where: whereLocation }),
    prisma.cylinder.count({ where: { ...whereLocation, status: "DAMAGED" } }),
    prisma.inventoryMovement.aggregate({
      where: { type: "RECEIPT", destinationLocationId: locationId ?? undefined, status: { in: ["RECEIVED", "COMPLETED"] }, receivedAt: { gte: start, lt: end } },
      _sum: { receivedQuantity: true }
    }),
    prisma.inventoryMovement.aggregate({
      where: { type: { not: "RECEIPT" }, destinationLocationId: locationId ?? undefined, status: { in: ["RECEIVED", "COMPLETED"] }, receivedAt: { gte: start, lt: end } },
      _sum: { receivedQuantity: true }
    }),
    prisma.inventoryMovement.aggregate({
      where: { sourceLocationId: locationId ?? undefined, status: { in: ["DISPATCHED", "RECEIVED", "COMPLETED"] }, dispatchedAt: { gte: start, lt: end } },
      _sum: { dispatchedQuantity: true }
    }),
    prisma.inventoryMovement.aggregate({
      where: { type: { in: ["RETURN_FROM_CUSTOMER", "RETURN_FROM_VEHICLE"] }, destinationLocationId: locationId ?? undefined, createdAt: { gte: start, lt: end } },
      _sum: { receivedQuantity: true, requestedQuantity: true }
    }),
    prisma.fieldSale.count({ where: { createdById: ownerId, createdAt: { gte: start, lt: end } } }),
    prisma.refillOrder.count({ where: { createdById: ownerId, createdAt: { gte: start, lt: end } } }),
    prisma.fullCylinderSale.count({ where: { createdById: ownerId, createdAt: { gte: start, lt: end } } }),
    prisma.billingPayment.groupBy({
      by: ["method"],
      where: { recordedById: ownerId, createdAt: { gte: start, lt: end } },
      _sum: { amount: true }
    })
  ]);

  const goodsReceived = (receipts._sum.receivedQuantity ?? 0) + (transfersIn._sum.receivedQuantity ?? 0);
  const transfersInQuantity = transfersIn._sum.receivedQuantity ?? 0;
  const transfersOutQuantity = transfersOut._sum.dispatchedQuantity ?? 0;
  const salesIssues = fieldSales + refillSales + fullCylinderSales;
  const returns = returned._sum.receivedQuantity ?? returned._sum.requestedQuantity ?? 0;
  const transfers = transfersOutQuantity;
  const expectedClosingStock = closingStock;
  const openingStock = Math.max(0, expectedClosingStock - goodsReceived - returns + salesIssues + transfers);
  const collection = (method: string) => payments.find((payment) => payment.method === method)?._sum.amount ?? new Prisma.Decimal(0);
  const cashCollections = collection("CASH");
  const mpesaCollections = collection("MPESA");
  const cardCollections = collection("CARD").plus(collection("ONLINE"));
  const expectedCash = cashCollections.plus(mpesaCollections).plus(cardCollections).toDecimalPlaces(2);

  return {
    owner,
    location,
    openingStock,
    goodsReceived,
    transfersIn: transfersInQuantity,
    transfersOut: transfersOutQuantity,
    salesIssues,
    transfers,
    returns,
    damagedCylinders,
    expectedClosingStock,
    cashCollections,
    mpesaCollections,
    cardCollections,
    expectedCash
  };
}

export function reconciliationLocked(status: string) {
  return status === "APPROVED" || status === "CLOSED";
}

export function actualClosingFromCountLines(actualClosingStock: number | null | undefined, countLines: { actualCount: number }[]) {
  return countLines.length ? countLines.reduce((sum, line) => sum + line.actualCount, 0) : actualClosingStock ?? 0;
}

export async function buildReconciliationCountLines({
  locationId,
  countLines
}: {
  locationId: string | null;
  countLines: z.infer<typeof countLineSchema>[];
}) {
  if (!countLines.length) return [];
  const systemCounts = await prisma.cylinder.groupBy({
    by: ["skuId", "status"],
    where: {
      ...(locationId ? { currentLocationId: locationId } : {}),
      OR: countLines.map((line) => ({ skuId: line.skuId, status: line.status as never }))
    },
    _count: { _all: true }
  });
  const systemByKey = new Map(systemCounts.map((row) => [`${row.skuId}:${row.status}`, row._count._all]));

  return countLines.map((line) => {
    const systemCount = systemByKey.get(`${line.skuId}:${line.status}`) ?? 0;
    const scannedCount = line.scannedCount ?? (line.countMode === "SCAN" ? line.actualCount : null);
    return {
      skuId: line.skuId,
      status: line.status,
      systemCount,
      actualCount: line.actualCount,
      scannedCount,
      variance: line.actualCount - systemCount,
      countMode: line.countMode,
      notes: line.notes?.trim() || null
    };
  });
}

export async function buildReconciliationVarianceCases({
  reconciliationId,
  locationId,
  date,
  stockVariance,
  paymentVariance,
  countLines,
  createdById
}: {
  reconciliationId: string;
  locationId: string | null;
  date: string | Date;
  stockVariance: number;
  paymentVariance: Prisma.Decimal;
  countLines: Awaited<ReturnType<typeof buildReconciliationCountLines>>;
  createdById?: string;
}) {
  const { start, end } = dayRange(date);
  const cases: Prisma.ReconciliationVarianceCaseCreateManyInput[] = [];

  countLines.forEach((line, index) => {
    if (line.variance === 0) return;
    cases.push({
      reference: generateVarianceCaseReference(line.variance < 0 ? "MISSING" : "EXTRA", index + 1),
      reconciliationId,
      type: line.variance < 0 ? "MISSING" : "EXTRA",
      skuId: line.skuId,
      locationId,
      expectedStatus: line.status as never,
      expectedQuantity: line.systemCount,
      actualQuantity: line.actualCount,
      varianceQuantity: line.variance,
      details: `${formatReconciliationLabel(line.status)} count variance. System ${line.systemCount}, actual ${line.actualCount}.`,
      createdById
    });
  });

  if (stockVariance !== 0 && !countLines.length) {
    cases.push({
      reference: generateVarianceCaseReference("STOCK", cases.length + 1),
      reconciliationId,
      type: "STOCK_VARIANCE",
      locationId,
      expectedQuantity: stockVariance > 0 ? null : Math.abs(stockVariance),
      actualQuantity: stockVariance > 0 ? stockVariance : null,
      varianceQuantity: stockVariance,
      details: `Summary stock variance recorded: ${stockVariance}.`,
      createdById
    });
  }

  if (!paymentVariance.equals(0)) {
    cases.push({
      reference: generateVarianceCaseReference("PAYMENT", cases.length + 1),
      reconciliationId,
      type: "PAYMENT_VARIANCE",
      locationId,
      details: `Payment variance recorded: ${paymentVariance.toFixed(2)}.`,
      createdById
    });
  }

  const failedScans = await prisma.scanEvent.findMany({
    where: {
      createdAt: { gte: start, lt: end },
      result: "FAILED",
      ...(locationId ? { OR: [{ expectedLocationId: locationId }, { scannedLocationId: locationId }] } : {})
    },
    orderBy: { createdAt: "asc" },
    take: 50
  });
  failedScans.forEach((scan, index) => {
    const failureReason = scan.failureReason?.toLowerCase() ?? "";
    const type = failureReason.includes("duplicate")
      ? "DUPLICATE"
      : failureReason.includes("location")
        ? "WRONG_LOCATION"
        : failureReason.includes("status")
          ? "WRONG_STATUS"
          : null;
    if (!type) return;
    cases.push({
      reference: generateVarianceCaseReference(type, cases.length + index + 1),
      reconciliationId,
      type,
      cylinderId: scan.cylinderId,
      locationId,
      expectedStatus: scan.expectedStatus,
      scannedStatus: scan.scannedStatus,
      expectedLocationId: scan.expectedLocationId,
      scannedLocationId: scan.scannedLocationId,
      varianceQuantity: 1,
      details: scan.failureReason ?? `Failed scan for ${scan.barcode}.`,
      createdById
    });
  });

  const overdueMovements = await prisma.inventoryMovement.findMany({
    where: {
      status: "DISPATCHED",
      expectedReceiptAt: { lt: new Date() },
      ...(locationId ? { OR: [{ sourceLocationId: locationId }, { destinationLocationId: locationId }] } : {})
    },
    orderBy: { expectedReceiptAt: "asc" },
    take: 50
  });
  overdueMovements.forEach((movement, index) => {
    cases.push({
      reference: generateVarianceCaseReference("OVERDUE", cases.length + index + 1),
      reconciliationId,
      type: "OVERDUE_IN_TRANSIT",
      movementId: movement.id,
      skuId: movement.skuId,
      locationId,
      expectedQuantity: movement.dispatchedQuantity ?? movement.approvedQuantity ?? movement.requestedQuantity,
      varianceQuantity: movement.dispatchedQuantity ?? movement.approvedQuantity ?? movement.requestedQuantity,
      details: `${movement.reference} is still in transit past expected receipt time.`,
      createdById
    });
  });

  return cases;
}
