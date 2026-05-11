import { z } from "zod";
import type { AppRole } from "@/lib/auth-types";
import { cylinderStatuses } from "@/lib/inventory";

export const inventoryMovementTypes = [
  "OPENING_BALANCE",
  "RECEIPT",
  "ISSUE",
  "TRANSFER",
  "RETURN_FROM_CUSTOMER",
  "RETURN_FROM_VEHICLE",
  "ADJUSTMENT",
  "DAMAGED_QUARANTINE",
  "MAINTENANCE_TRANSFER"
] as const;

export const inventoryMovementStatuses = [
  "REQUESTED",
  "APPROVED",
  "DISPATCHED",
  "RECEIVED",
  "COMPLETED",
  "VARIANCE_LOGGED",
  "REJECTED"
] as const;

export const movementActionSchema = z.object({
  action: z.enum(["approve", "reject", "dispatch", "receive", "log-variance", "complete"]),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1.").optional(),
  varianceReason: z.string().trim().max(240, "Variance reason must be 240 characters or fewer.").optional(),
  notes: z.string().trim().max(400, "Notes must be 400 characters or fewer.").optional()
});

export const inventoryMovementSchema = z
  .object({
    reference: z
      .string()
      .trim()
      .min(3, "Reference must be at least 3 characters.")
      .max(50, "Reference must be 50 characters or fewer."),
    type: z.enum(inventoryMovementTypes),
    skuId: z.string().min(1, "Select a SKU or cylinder size."),
    sourceLocationId: z.string().optional().nullable(),
    destinationLocationId: z.string().optional().nullable(),
    sourceStatus: z.enum(cylinderStatuses).optional().nullable(),
    destinationStatus: z.enum(cylinderStatuses),
    requestedQuantity: z.coerce.number().int().min(1, "Quantity must be at least 1.").max(200, "Enter 200 or fewer cylinders at a time."),
    notes: z.string().trim().max(400, "Notes must be 400 characters or fewer.").optional().nullable()
  })
  .superRefine((value, context) => {
    if (requiresSource(value.type) && !value.sourceLocationId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceLocationId"],
        message: "Select a source location for this movement type."
      });
    }

    if (requiresDestination(value.type) && !value.destinationLocationId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["destinationLocationId"],
        message: "Select a destination location for this movement type."
      });
    }

    if (requiresSource(value.type) && !value.sourceStatus) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceStatus"],
        message: "Select the source cylinder status to move."
      });
    }
  });

export type InventoryMovementFormValues = z.infer<typeof inventoryMovementSchema>;
export type MovementActionValues = z.infer<typeof movementActionSchema>;
export type InventoryMovementTypeKey = (typeof inventoryMovementTypes)[number];
export type InventoryMovementStatusKey = (typeof inventoryMovementStatuses)[number];

export function canViewInventoryMovements(role: AppRole) {
  return ["ADMIN", "WAREHOUSE_MANAGER", "PLANT_MANAGER", "RSO", "MSO", "SERVICE_CENTRE_STAFF", "AUDITOR"].includes(role);
}

export function canRequestInventoryMovements(role: AppRole) {
  return ["ADMIN", "WAREHOUSE_MANAGER", "PLANT_MANAGER", "RSO", "MSO", "SERVICE_CENTRE_STAFF"].includes(role);
}

export function canApproveInventoryMovements(role: AppRole) {
  return role === "ADMIN" || role === "WAREHOUSE_MANAGER" || role === "PLANT_MANAGER";
}

export function canDispatchInventoryMovements(role: AppRole) {
  return role === "ADMIN" || role === "WAREHOUSE_MANAGER" || role === "PLANT_MANAGER";
}

export function canReceiveInventoryMovements(role: AppRole) {
  return ["ADMIN", "WAREHOUSE_MANAGER", "PLANT_MANAGER", "RSO", "MSO", "SERVICE_CENTRE_STAFF"].includes(role);
}

export function formatMovementType(type: string) {
  return titleize(type);
}

export function formatMovementStatus(status: string) {
  return titleize(status);
}

export function normalizeInventoryMovementInput(input: InventoryMovementFormValues) {
  return {
    reference: input.reference.trim().toUpperCase(),
    type: input.type,
    skuId: input.skuId,
    sourceLocationId: input.sourceLocationId || null,
    destinationLocationId: input.destinationLocationId || null,
    sourceStatus: input.sourceStatus || null,
    destinationStatus: input.destinationStatus,
    requestedQuantity: input.requestedQuantity,
    notes: input.notes?.trim() || null
  };
}

export function requiresSource(type: InventoryMovementTypeKey) {
  return !["OPENING_BALANCE", "RECEIPT", "RETURN_FROM_CUSTOMER", "ADJUSTMENT"].includes(type);
}

export function requiresDestination(type: InventoryMovementTypeKey) {
  return type !== "ISSUE";
}

export function completesOnDispatch(type: InventoryMovementTypeKey) {
  return type === "ISSUE";
}

export function canCreateReceiptCylinders(type: InventoryMovementTypeKey) {
  return ["OPENING_BALANCE", "RECEIPT", "RETURN_FROM_CUSTOMER", "ADJUSTMENT"].includes(type);
}

function titleize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
