import { z } from "zod";
import type { AppRole } from "@/lib/auth-types";
import { sellingPointDestinationCodes } from "@/lib/selling-point-distribution";

export const emptyReturnConditions = [
  "GOOD",
  "DAMAGED",
  "LEAKING",
  "MISSING_VALVE",
  "WRONG_BRAND",
  "UNCLEAR_SERIAL",
  "NON_CODED"
] as const;

export const reverseWarehouseCodes = [
  "WH-WANDIEGE-MAIN",
  "WH-UGUNJA-SECONDARY",
  "WH-LAKE-GAS-NBO",
  "WH-OILCOM-NBO"
] as const;

export const emptyReturnSchema = z.object({
  customerId: z.string().optional().nullable(),
  customerPhone: z.string().trim().optional().nullable(),
  cylinderCode: z.string().trim().optional().nullable(),
  noCode: z.coerce.boolean().optional().default(false),
  serialNumber: z.string().trim().optional().nullable(),
  cylinderSizeKg: z.coerce.number().int().positive().optional().nullable(),
  manufacturer: z.string().trim().max(80).optional().nullable(),
  photoPlaceholder: z.string().trim().max(160).optional().nullable(),
  locationId: z.string().optional().nullable(),
  condition: z.enum(emptyReturnConditions),
  remarks: z.string().trim().max(500).optional().nullable()
}).superRefine((value, context) => {
  if (!value.customerId && !value.customerPhone) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["customerId"], message: "Select or search the customer returning the empty cylinder." });
  }
  if (!value.noCode && !value.cylinderCode) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["cylinderCode"], message: "Scan the returned empty cylinder barcode or serial number." });
  }
  if (value.noCode && !value.serialNumber) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["serialNumber"], message: "Enter the returned cylinder serial number." });
  }
  if (value.noCode && !value.cylinderSizeKg) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["cylinderSizeKg"], message: "Select the returned cylinder size." });
  }
});

export const emptyReturnTransferSchema = z.object({
  reference: z.string().trim().min(3, "Transfer number is required.").max(60),
  sourceLocationId: z.string().optional().nullable(),
  destinationLocationId: z.string().min(1, "Select the destination warehouse."),
  cylinderCodes: z.array(z.string().trim().min(1)).min(1, "Scan at least one empty cylinder."),
  vehicle: z.string().trim().min(2, "Vehicle is required.").max(80),
  driverSalesRep: z.string().trim().min(2, "Driver or sales rep is required.").max(100),
  route: z.string().trim().min(2, "Route is required.").max(100),
  dispatchOfficerName: z.string().trim().min(2, "Dispatch officer is required.").max(100),
  receivingOfficerName: z.string().trim().min(2, "Receiving officer is required.").max(100),
  transferDateTime: z.string().min(1, "Transfer date/time is required."),
  expectedReceiptAt: z.string().optional().nullable(),
  remarks: z.string().trim().max(500).optional().nullable()
});

export const emptyReturnReceiveSchema = z.object({
  action: z.literal("receive"),
  receivedCodes: z.array(z.string().trim().min(1)).min(1, "Scan at least one returned empty at receipt."),
  receivingOfficerName: z.string().trim().max(100).optional().nullable(),
  remarks: z.string().trim().max(500).optional().nullable()
});

export type EmptyReturnInput = z.infer<typeof emptyReturnSchema>;
export type EmptyReturnTransferInput = z.infer<typeof emptyReturnTransferSchema>;

export function canManageEmptyReturns(role: AppRole) {
  return role === "ADMIN" || role === "RSO" || role === "MSO" || role === "SERVICE_CENTRE_STAFF";
}

export function canDispatchEmptyReturns(role: AppRole) {
  return role === "ADMIN" || role === "RSO" || role === "MSO" || role === "SERVICE_CENTRE_STAFF";
}

export function canReceiveEmptyReturns(role: AppRole) {
  return role === "ADMIN" || role === "WAREHOUSE_MANAGER";
}

export function canViewEmptyReturns(role: AppRole) {
  return canDispatchEmptyReturns(role) || canReceiveEmptyReturns(role) || role === "AUDITOR";
}

export function normalizeReverseCode(value: string) {
  return value.trim().toUpperCase();
}

export function parseConditionLabel(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function isDamagedReturnCondition(condition: string) {
  return condition === "DAMAGED" || condition === "LEAKING" || condition === "MISSING_VALVE";
}

export function isSellingPointCode(code: string) {
  return sellingPointDestinationCodes.includes(code as never);
}
