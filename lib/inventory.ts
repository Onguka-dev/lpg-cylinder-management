import { z } from "zod";
import type { AppRole } from "@/lib/auth-types";

export const cylinderStatuses = [
  "FILLED",
  "EMPTY",
  "DAMAGED",
  "IN_TRANSIT",
  "RESERVED",
  "UNDER_MAINTENANCE",
  "WITH_CUSTOMER"
] as const;

export const locationMasterTypes = [
  "LOCATION",
  "WAREHOUSE",
  "RETAIL_OUTLET",
  "MAINTENANCE_LOCATION",
  "DAMAGED_QUARANTINE_LOCATION"
] as const;

export const cylinderSchema = z.object({
  serialNumber: z
    .string()
    .trim()
    .min(3, "Serial number must be at least 3 characters.")
    .max(60, "Serial number must be 60 characters or fewer."),
  barcode: z.string().trim().max(80, "Barcode/RFID placeholder must be 80 characters or fewer.").optional().nullable(),
  skuId: z.string().min(1, "Select a SKU or cylinder size."),
  manufactureDate: z.string().optional().nullable(),
  inspectionDueDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  hydroTestDueDate: z.string().optional().nullable(),
  unsafeStatus: z.coerce.boolean().optional(),
  quarantinedStatus: z.coerce.boolean().optional(),
  maintenanceStatus: z.enum(["NONE", "OPEN", "IN_PROGRESS", "CLEARED", "SCRAP_PLACEHOLDER"]).optional(),
  currentLocationId: z.string().min(1, "Select a current location."),
  status: z.enum(cylinderStatuses),
  notes: z.string().trim().max(400, "Notes must be 400 characters or fewer.").optional().nullable()
});

export const openingBalanceSchema = z.object({
  reference: z
    .string()
    .trim()
    .min(3, "Reference must be at least 3 characters.")
    .max(50, "Reference must be 50 characters or fewer."),
  skuId: z.string().min(1, "Select a SKU or cylinder size."),
  locationId: z.string().min(1, "Select a location."),
  status: z.enum(cylinderStatuses),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1.").max(100, "Enter 100 or fewer cylinders at a time."),
  serialPrefix: z
    .string()
    .trim()
    .min(2, "Serial prefix must be at least 2 characters.")
    .max(30, "Serial prefix must be 30 characters or fewer.")
    .regex(/^[A-Z0-9-]+$/i, "Serial prefix can only use letters, numbers, and hyphens."),
  notes: z.string().trim().max(400, "Notes must be 400 characters or fewer.").optional().nullable()
});

export type CylinderFormValues = z.infer<typeof cylinderSchema>;
export type OpeningBalanceFormValues = z.infer<typeof openingBalanceSchema>;

export function canManageInventory(role: AppRole) {
  return role === "ADMIN" || role === "WAREHOUSE_MANAGER";
}

export function canViewInventory(role: AppRole) {
  return canManageInventory(role) || role === "AUDITOR";
}

export function normalizeCylinderInput(input: CylinderFormValues) {
  return {
    serialNumber: input.serialNumber.trim().toUpperCase(),
    barcode: input.barcode?.trim() || null,
    skuId: input.skuId,
    manufactureDate: input.manufactureDate ? new Date(input.manufactureDate) : null,
    inspectionDueDate: input.inspectionDueDate ? new Date(input.inspectionDueDate) : null,
    expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
    hydroTestDueDate: input.hydroTestDueDate ? new Date(input.hydroTestDueDate) : null,
    unsafeStatus: input.unsafeStatus ?? false,
    quarantinedStatus: input.quarantinedStatus ?? false,
    maintenanceStatus: input.maintenanceStatus ?? "NONE",
    currentLocationId: input.currentLocationId,
    status: input.status,
    notes: input.notes?.trim() || null
  };
}

export function formatCylinderStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
