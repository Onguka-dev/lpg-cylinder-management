import { z } from "zod";
import type { AppRole } from "@/lib/auth-types";

export const plantTransferStatuses = [
  "DRAFT",
  "DISPATCHED_TO_PLANT",
  "RECEIVED_AT_PLANT",
  "VARIANCE_LOGGED",
  "REFILLED",
  "RETURN_DISPATCHED",
  "COMPLETED"
] as const;

export const plantLineStatuses = [
  "EXPECTED",
  "RECEIVED_AT_PLANT",
  "MISSING",
  "EXTRA",
  "DAMAGED",
  "REFILLED",
  "RETURNED_TO_WAREHOUSE"
] as const;

export const plantLocationCodes = {
  wandiege: "WH-WANDIEGE-MAIN",
  plant: "PLANT-SABUNI-ROAD"
} as const;

export const plantTransferSchema = z.object({
  reference: z.string().trim().min(3).max(60),
  cylinderCodes: z.array(z.string().trim().min(1)).min(1, "Select at least one empty cylinder."),
  vehicle: z.string().trim().min(2).max(80),
  driver: z.string().trim().min(2).max(80),
  sealNumber: z.string().trim().min(2).max(80),
  dispatchNote: z.string().trim().max(120).optional().nullable(),
  expectedReceiptTime: z.string().optional().nullable(),
  remarks: z.string().trim().max(500).optional().nullable()
});

export const plantReceiveSchema = z.object({
  receivedCodes: z.array(z.string().trim().min(1)).default([]),
  damagedCodes: z.array(z.string().trim().min(1)).default([]),
  extraCodes: z.array(z.string().trim().min(1)).default([])
});

export const refillBatchSchema = z.object({
  reference: z.string().trim().min(3).max(60),
  transferLineIds: z.array(z.string().min(1)).min(1, "Select received cylinders for refill."),
  qualityInspectionStatus: z.enum(["PASSED", "FAILED"]),
  qualityNotes: z.string().trim().max(500).optional().nullable()
});

export const plantReturnDispatchSchema = z.object({
  vehicle: z.string().trim().min(2).max(80),
  driver: z.string().trim().min(2).max(80),
  sealNumber: z.string().trim().min(2).max(80),
  remarks: z.string().trim().max(500).optional().nullable()
});

export const plantReturnReceiveSchema = z.object({
  receivedCodes: z.array(z.string().trim().min(1)).min(1, "Scan at least one returning filled cylinder.")
});

export type PlantTransferInput = z.infer<typeof plantTransferSchema>;

export function canManagePlantTransfers(role: AppRole) {
  return role === "ADMIN" || role === "WAREHOUSE_MANAGER" || role === "PLANT_MANAGER";
}

export function canViewPlantTransfers(role: AppRole) {
  return canManagePlantTransfers(role) || role === "AUDITOR";
}

export function normalizeCylinderCode(code: string) {
  return code.trim().toUpperCase();
}

export function normalizeCodeList(codes: string[]) {
  return Array.from(new Set(codes.map(normalizeCylinderCode).filter(Boolean)));
}

export function findDuplicateCodes(codes: string[]) {
  const seen = new Set<string>();
  for (const code of codes.map(normalizeCylinderCode)) {
    if (seen.has(code)) return code;
    seen.add(code);
  }
  return null;
}

export function formatPlantWorkflowLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
