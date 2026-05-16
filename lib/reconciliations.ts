import { z } from "zod";
import { Prisma } from "@prisma/client";
import type { AppRole } from "@/lib/auth-types";
import { prisma } from "@/lib/prisma";

export const reconciliationScopes = ["RSO", "MSO", "WAREHOUSE", "SERVICE_CENTRE"] as const;
export const reconciliationStatuses = ["DRAFT", "SUBMITTED", "APPROVED", "RETURNED"] as const;

export const reconciliationCreateSchema = z.object({
  reconciliationDate: z.string().min(1, "Select a reconciliation date."),
  scope: z.enum(reconciliationScopes),
  ownerId: z.string().min(1, "Select the accountable user."),
  actualClosingStock: z.coerce.number().int().nonnegative("Actual closing stock cannot be negative."),
  actualCash: z.coerce.number().nonnegative("Actual cash cannot be negative."),
  stockExplanation: z.string().trim().max(500, "Stock explanation must be 500 characters or fewer.").optional().nullable(),
  paymentExplanation: z.string().trim().max(500, "Payment explanation must be 500 characters or fewer.").optional().nullable()
});

export const reconciliationReviewSchema = z.object({
  status: z.enum(["APPROVED", "RETURNED"]),
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
  const [closingStock, damagedCylinders, received, issued, returned, fieldSales, refillSales, payments] = await Promise.all([
    prisma.cylinder.count({ where: whereLocation }),
    prisma.cylinder.count({ where: { ...whereLocation, status: "DAMAGED" } }),
    prisma.inventoryMovement.aggregate({
      where: { destinationLocationId: locationId ?? undefined, status: { in: ["RECEIVED", "COMPLETED"] }, receivedAt: { gte: start, lt: end } },
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
    prisma.billingPayment.groupBy({
      by: ["method"],
      where: { recordedById: ownerId, createdAt: { gte: start, lt: end } },
      _sum: { amount: true }
    })
  ]);

  const goodsReceived = received._sum.receivedQuantity ?? 0;
  const salesIssues = fieldSales + refillSales + (issued._sum.dispatchedQuantity ?? 0);
  const returns = returned._sum.receivedQuantity ?? returned._sum.requestedQuantity ?? 0;
  const transfers = issued._sum.dispatchedQuantity ?? 0;
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
  return status === "APPROVED";
}
