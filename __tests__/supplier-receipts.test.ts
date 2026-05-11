import { describe, expect, it } from "vitest";
import {
  canManageSupplierReceipts,
  canViewSupplierReceipts,
  conditionToCylinderStatus,
  normalizeSupplierReceiptInput,
  supplierReceiptSchema,
  supplierReceiptWarehouseCodes,
  validateReceiptLineDuplicates
} from "@/lib/supplier-receipts";

describe("supplier receipt workflow", () => {
  const validReceipt = {
    reference: "SUP-RCV-TEST",
    warehouseId: "warehouse-id",
    supplierManufacturer: "Lake Gas",
    purchaseOrderReference: "PO-TEST",
    deliveryNote: "DN-TEST",
    vehicleTruckNumber: "KDK 152E",
    receiptDateTime: "2026-05-11T12:00",
    receivedByName: "Warehouse Manager",
    remarks: "Sample purchase",
    attachmentPlaceholder: "delivery-note.pdf",
    status: "POSTED",
    lines: [
      {
        cylinderSizeKg: 6,
        factorySerialNo: "FSN-6KG-001",
        barcode: "BC-6KG-001",
        manufacturer: "Lake Gas",
        manufactureDate: "2026-01-01",
        condition: "FILLED"
      },
      {
        cylinderSizeKg: 13,
        factorySerialNo: "FSN-13KG-001",
        barcode: "BC-13KG-001",
        manufacturer: "Lake Gas",
        manufactureDate: "2026-01-01",
        condition: "EMPTY"
      },
      {
        cylinderSizeKg: 50,
        factorySerialNo: "FSN-50KG-001",
        barcode: "BC-50KG-001",
        manufacturer: "Oilcom",
        manufactureDate: "2026-01-01",
        condition: "DAMAGED"
      }
    ]
  };

  it("limits supplier receipt warehouses to approved receiving warehouses", () => {
    expect(supplierReceiptWarehouseCodes).toEqual([
      "WH-WANDIEGE-MAIN",
      "WH-LAKE-GAS-NBO",
      "WH-OILCOM-NBO"
    ]);
  });

  it("validates supplier receipt headers and 6kg, 13kg, 50kg lines", () => {
    expect(supplierReceiptSchema.safeParse(validReceipt).success).toBe(true);
    expect(
      supplierReceiptSchema.safeParse({
        ...validReceipt,
        lines: [{ ...validReceipt.lines[0], cylinderSizeKg: 12 }]
      }).success
    ).toBe(false);
  });

  it("detects duplicate serial numbers and barcodes before saving", () => {
    expect(validateReceiptLineDuplicates([
      { factorySerialNo: "FSN-1", barcode: "BC-1" },
      { factorySerialNo: "fsn-1", barcode: "BC-2" }
    ])).toContain("Duplicate factory serial");
    expect(validateReceiptLineDuplicates([
      { factorySerialNo: "FSN-1", barcode: "BC-1" },
      { factorySerialNo: "FSN-2", barcode: "bc-1" }
    ])).toContain("Duplicate barcode");
  });

  it("maps receipt condition to cylinder status", () => {
    expect(conditionToCylinderStatus("FILLED")).toBe("FILLED");
    expect(conditionToCylinderStatus("EMPTY")).toBe("EMPTY");
    expect(conditionToCylinderStatus("DAMAGED")).toBe("DAMAGED");
    expect(conditionToCylinderStatus("QUARANTINED")).toBe("QUARANTINED");
  });

  it("normalizes receipt data for persistence", () => {
    const parsed = supplierReceiptSchema.parse(validReceipt);
    const normalized = normalizeSupplierReceiptInput(parsed);

    expect(normalized.reference).toBe("SUP-RCV-TEST");
    expect(normalized.purchaseOrderReference).toBe("PO-TEST");
    expect(normalized.lines[0].factorySerialNo).toBe("FSN-6KG-001");
  });

  it("aligns permissions with inventory management roles", () => {
    expect(canManageSupplierReceipts("ADMIN")).toBe(true);
    expect(canManageSupplierReceipts("WAREHOUSE_MANAGER")).toBe(true);
    expect(canManageSupplierReceipts("PLANT_MANAGER")).toBe(true);
    expect(canManageSupplierReceipts("AUDITOR")).toBe(false);
    expect(canViewSupplierReceipts("AUDITOR")).toBe(true);
  });
});
