import type { Prisma } from "@prisma/client";
import type { AppSession } from "@/lib/auth-types";
import { prisma } from "@/lib/prisma";

export const auditCategories = [
  "AUTH",
  "MASTER_DATA",
  "CUSTOMER",
  "INVENTORY",
  "APPROVAL",
  "ORDER",
  "DELIVERY",
  "BILLING",
  "PAYMENT",
  "RECONCILIATION",
  "COMPLIANCE",
  "INTEGRATION",
  "NOTIFICATION",
  "OFFLINE_SYNC",
  "SECURITY",
  "SYSTEM"
] as const;

export const auditSeverities = ["INFO", "WARNING", "CRITICAL"] as const;

export async function writeAuditLog(input: {
  action: string;
  category: (typeof auditCategories)[number];
  details: string;
  severity?: (typeof auditSeverities)[number];
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  request?: Request;
  session?: AppSession | null;
  userId?: string | null;
}) {
  const headers = input.request?.headers;

  return prisma.auditLog.create({
    data: {
      action: input.action,
      category: input.category,
      severity: input.severity ?? "INFO",
      details: input.details,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
      ipAddress: headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: headers?.get("user-agent") ?? null,
      userId: input.userId ?? input.session?.user.id ?? null
    }
  });
}

export function auditCategoryForAction(action: string) {
  const normalized = action.toUpperCase();

  if (normalized.includes("LOGIN") || normalized.includes("LOGOUT") || normalized.includes("SESSION")) return "AUTH";
  if (normalized.includes("MASTER")) return "MASTER_DATA";
  if (normalized.includes("CUSTOMER")) return "CUSTOMER";
  if (normalized.includes("INVENTORY") || normalized.includes("CYLINDER") || normalized.includes("STOCK")) return "INVENTORY";
  if (normalized.includes("APPROV")) return "APPROVAL";
  if (normalized.includes("ORDER") || normalized.includes("REFILL") || normalized.includes("FIELD_SALE")) return "ORDER";
  if (normalized.includes("DELIVERY")) return "DELIVERY";
  if (normalized.includes("INVOICE") || normalized.includes("BILLING")) return "BILLING";
  if (normalized.includes("PAYMENT") || normalized.includes("RECEIPT")) return "PAYMENT";
  if (normalized.includes("RECONCILIATION")) return "RECONCILIATION";
  if (normalized.includes("SAFETY") || normalized.includes("MAINTENANCE") || normalized.includes("COMPLIANCE")) return "COMPLIANCE";
  if (normalized.includes("INTEGRATION")) return "INTEGRATION";
  if (normalized.includes("NOTIFICATION")) return "NOTIFICATION";
  if (normalized.includes("OFFLINE")) return "OFFLINE_SYNC";
  if (normalized.includes("SECURITY") || normalized.includes("PERMISSION")) return "SECURITY";

  return "SYSTEM";
}
