import { z } from "zod";
import { CylinderStatus, SupplierReceiptCondition } from "@prisma/client";
import type { AppRole } from "@/lib/auth-types";

export const supplierReceiptWarehouseCodes = [
  "WH-WANDIEGE-MAIN",
  "WH-LAKE-GAS-NBO",
  "WH-OILCOM-NBO"
] as const;

export const supplierReceiptStatuses = ["DRAFT", "REVIEWED", "POSTED"] as const;
export const supplierReceiptConditions = ["FILLED", "EMPTY", "DAMAGED", "QUARANTINED"] as const;
export const supplierReceiptSizes = [6, 13, 50] as const;

export const supplierReceiptLineSchema = z.object({
  cylinderSizeKg: z.coerce
    .number()
    .int()
    .refine((value) => supplierReceiptSizes.includes(value as (typeof supplierReceiptSizes)[number]), "Cylinder size must be 6kg, 13kg, or 50kg."),
  factorySerialNo: z.string().trim().min(3, "Factory serial number is required.").max(80, "Factory serial number must be 80 characters or fewer."),
  barcode: z.string().trim().min(3, "Barcode/QR code is required.").max(120, "Barcode/QR code must be 120 characters or fewer."),
  qrCode: z.string().trim().max(120, "QR code must be 120 characters or fewer.").optional().nullable(),
  manufacturer: z.string().trim().min(2, "Manufacturer is required.").max(120, "Manufacturer must be 120 characters or fewer."),
  manufactureDate: z.string().optional().nullable(),
  condition: z.enum(supplierReceiptConditions)
});

export const supplierReceiptSchema = z.object({
  reference: z.string().trim().min(3, "Receipt reference is required.").max(50, "Receipt reference must be 50 characters or fewer."),
  warehouseId: z.string().min(1, "Select a receiving warehouse."),
  supplierManufacturer: z.string().trim().min(2, "Supplier/manufacturer is required.").max(120, "Supplier/manufacturer must be 120 characters or fewer."),
  purchaseOrderReference: z.string().trim().min(2, "Purchase order/reference is required.").max(80, "Purchase order/reference must be 80 characters or fewer."),
  deliveryNote: z.string().trim().max(80, "Delivery note must be 80 characters or fewer.").optional().nullable(),
  vehicleTruckNumber: z.string().trim().max(40, "Vehicle/truck number must be 40 characters or fewer.").optional().nullable(),
  receiptDateTime: z.string().min(1, "Receipt date/time is required."),
  receivedByName: z.string().trim().min(2, "Received by is required.").max(100, "Received by must be 100 characters or fewer."),
  remarks: z.string().trim().max(500, "Remarks must be 500 characters or fewer.").optional().nullable(),
  attachmentPlaceholder: z.string().trim().max(200, "Attachment placeholder must be 200 characters or fewer.").optional().nullable(),
  status: z.enum(supplierReceiptStatuses),
  lines: z.array(supplierReceiptLineSchema).min(1, "Add at least one cylinder line.").max(300, "A receipt can contain 300 cylinder lines at a time.")
});

export type SupplierReceiptFormValues = z.infer<typeof supplierReceiptSchema>;
export type SupplierReceiptLineValues = z.infer<typeof supplierReceiptLineSchema>;

export function canManageSupplierReceipts(role: AppRole) {
  return role === "ADMIN" || role === "WAREHOUSE_MANAGER" || role === "PLANT_MANAGER";
}

export function canViewSupplierReceipts(role: AppRole) {
  return canManageSupplierReceipts(role) || role === "AUDITOR";
}

export function normalizeSupplierReceiptInput(input: SupplierReceiptFormValues) {
  return {
    reference: input.reference.trim().toUpperCase(),
    warehouseId: input.warehouseId,
    supplierManufacturer: input.supplierManufacturer.trim(),
    purchaseOrderReference: input.purchaseOrderReference.trim().toUpperCase(),
    deliveryNote: input.deliveryNote?.trim() || null,
    vehicleTruckNumber: input.vehicleTruckNumber?.trim().toUpperCase() || null,
    receiptDateTime: new Date(input.receiptDateTime),
    receivedByName: input.receivedByName.trim(),
    remarks: input.remarks?.trim() || null,
    attachmentPlaceholder: input.attachmentPlaceholder?.trim() || null,
    status: input.status,
    lines: input.lines.map((line) => ({
      cylinderSizeKg: line.cylinderSizeKg,
      factorySerialNo: line.factorySerialNo.trim().toUpperCase(),
      barcode: line.barcode.trim().toUpperCase(),
      qrCode: line.qrCode?.trim().toUpperCase() || null,
      manufacturer: line.manufacturer.trim(),
      manufactureDate: line.manufactureDate ? new Date(line.manufactureDate) : null,
      condition: line.condition
    }))
  };
}

export function conditionToCylinderStatus(condition: SupplierReceiptCondition | string): CylinderStatus {
  if (condition === "DAMAGED") return "DAMAGED";
  if (condition === "QUARANTINED") return "QUARANTINED";
  if (condition === "EMPTY") return "EMPTY";
  return "FILLED";
}

export function validateReceiptLineDuplicates(lines: Array<{ factorySerialNo: string; barcode: string }>) {
  const serials = new Set<string>();
  const barcodes = new Set<string>();

  for (const line of lines) {
    const serial = line.factorySerialNo.trim().toUpperCase();
    const barcode = line.barcode.trim().toUpperCase();

    if (serials.has(serial)) return `Duplicate factory serial number in receipt: ${serial}.`;
    if (barcodes.has(barcode)) return `Duplicate barcode/QR code in receipt: ${barcode}.`;

    serials.add(serial);
    barcodes.add(barcode);
  }

  return null;
}

export function formatSupplierReceiptStatus(status: string) {
  return titleize(status);
}

export function formatSupplierReceiptCondition(condition: string) {
  return titleize(condition);
}

function titleize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
