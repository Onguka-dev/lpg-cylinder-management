import { z } from "zod";
import type { AppRole } from "@/lib/auth-types";

export const cylinderStatuses = [
  "FILLED",
  "EMPTY",
  "EMPTY_IN_TRANSIT",
  "FILLED_IN_TRANSIT",
  "FILLED_AT_WAREHOUSE",
  "DAMAGED",
  "IN_TRANSIT",
  "RESERVED",
  "UNDER_MAINTENANCE",
  "WITH_CUSTOMER",
  "QUARANTINED",
  "SCRAPPED_WRITTEN_OFF",
  "LOST_OVERDUE"
] as const;

export const blockedCylinderStatuses = [
  "DAMAGED",
  "QUARANTINED",
  "UNDER_MAINTENANCE",
  "SCRAPPED_WRITTEN_OFF",
  "LOST_OVERDUE"
] as const;

export const locationMasterTypes = [
  "LOCATION",
  "WAREHOUSE",
  "RETAIL_OUTLET",
  "VEHICLE",
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
  factorySerialNo: z.string().trim().max(80, "Factory serial number must be 80 characters or fewer.").optional().nullable(),
  qrCode: z.string().trim().max(120, "QR code must be 120 characters or fewer.").optional().nullable(),
  cylinderSizeKg: z.coerce.number().int().positive("Cylinder size must be positive.").optional().nullable(),
  manufacturer: z.string().trim().max(120, "Manufacturer must be 120 characters or fewer.").optional().nullable(),
  skuId: z.string().min(1, "Select a SKU or cylinder size."),
  manufactureDate: z.string().optional().nullable(),
  inspectionDueDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  hydroTestDueDate: z.string().optional().nullable(),
  unsafeStatus: z.coerce.boolean().optional(),
  quarantinedStatus: z.coerce.boolean().optional(),
  activeStatus: z.coerce.boolean().optional(),
  companyOwned: z.coerce.boolean().optional(),
  maintenanceStatus: z.enum(["NONE", "OPEN", "IN_PROGRESS", "CLEARED", "SCRAP_PLACEHOLDER"]).optional(),
  currentLocationId: z.string().min(1, "Select a current location."),
  status: z.enum(cylinderStatuses),
  blockedReason: z.string().trim().max(240, "Blocked reason must be 240 characters or fewer.").optional().nullable(),
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
  return role === "ADMIN" || role === "WAREHOUSE_MANAGER" || role === "PLANT_MANAGER";
}

export function canViewInventory(role: AppRole) {
  return canManageInventory(role) || role === "AUDITOR" || role === "SERVICE_CENTRE_STAFF";
}

export function normalizeCylinderInput(input: CylinderFormValues) {
  const serialNumber = input.serialNumber.trim().toUpperCase();
  const blockedReason = input.blockedReason?.trim() || defaultCylinderBlockedReason(input.status, {
    unsafeStatus: input.unsafeStatus,
    quarantinedStatus: input.quarantinedStatus,
    maintenanceStatus: input.maintenanceStatus
  });

  return {
    serialNumber,
    barcode: input.barcode?.trim() || null,
    factorySerialNo: input.factorySerialNo?.trim().toUpperCase() || serialNumber,
    qrCode: input.qrCode?.trim() || null,
    cylinderSizeKg: input.cylinderSizeKg ?? null,
    manufacturer: input.manufacturer?.trim() || null,
    skuId: input.skuId,
    manufactureDate: input.manufactureDate ? new Date(input.manufactureDate) : null,
    inspectionDueDate: input.inspectionDueDate ? new Date(input.inspectionDueDate) : null,
    expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
    hydroTestDueDate: input.hydroTestDueDate ? new Date(input.hydroTestDueDate) : null,
    unsafeStatus: input.unsafeStatus ?? false,
    quarantinedStatus: input.quarantinedStatus ?? false,
    activeStatus: input.activeStatus ?? true,
    companyOwned: input.companyOwned ?? true,
    maintenanceStatus: input.maintenanceStatus ?? "NONE",
    currentLocationId: input.currentLocationId,
    status: input.status,
    blockedReason,
    notes: input.notes?.trim() || null
  };
}

export function defaultCylinderBlockedReason(
  status: string,
  flags: { unsafeStatus?: boolean; quarantinedStatus?: boolean; maintenanceStatus?: string } = {}
) {
  if (status === "DAMAGED") return "Cylinder is damaged.";
  if (status === "QUARANTINED" || flags.quarantinedStatus) return "Cylinder is quarantined.";
  if (status === "SCRAPPED_WRITTEN_OFF") return "Cylinder is scrapped or written off.";
  if (status === "LOST_OVERDUE") return "Cylinder is lost or overdue.";
  if (status === "UNDER_MAINTENANCE" || flags.maintenanceStatus === "OPEN" || flags.maintenanceStatus === "IN_PROGRESS") return "Cylinder is under maintenance.";
  if (flags.unsafeStatus) return "Cylinder is marked unsafe.";
  return null;
}

export function isCylinderBlockedForSaleOrDispatch(input: {
  status: string;
  activeStatus?: boolean | null;
  unsafeStatus?: boolean | null;
  quarantinedStatus?: boolean | null;
  maintenanceStatus?: string | null;
}) {
  return Boolean(
    input.activeStatus === false ||
      blockedCylinderStatuses.includes(input.status as (typeof blockedCylinderStatuses)[number]) ||
      input.unsafeStatus ||
      input.quarantinedStatus ||
      input.maintenanceStatus === "OPEN" ||
      input.maintenanceStatus === "IN_PROGRESS"
  );
}

export function assertSingleCurrentLocation(input: { currentLocationId?: string | null }) {
  if (!input.currentLocationId) {
    throw new Error("CYLINDER_LOCATION_REQUIRED");
  }
}

export function assertNoOpenCustomerCustody(openCustodyCount: number) {
  if (openCustodyCount > 0) {
    throw new Error("CYLINDER_ALREADY_IN_CUSTOMER_CUSTODY");
  }
}

export function formatCylinderStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
