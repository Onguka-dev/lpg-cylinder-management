import { describe, expect, it } from "vitest";
import {
  canManageInventory,
  canViewInventory,
  cylinderSchema,
  cylinderStatuses,
  openingBalanceSchema
} from "@/lib/inventory";
import {
  canApproveInventoryMovements,
  canCreateReceiptCylinders,
  canRequestInventoryMovements,
  canViewInventoryMovements,
  inventoryMovementSchema,
  inventoryMovementTypes
} from "@/lib/inventory-movements";

describe("inventory foundation", () => {
  it("supports the required cylinder statuses", () => {
    expect(cylinderStatuses).toEqual([
      "FILLED",
      "EMPTY",
      "DAMAGED",
      "IN_TRANSIT",
      "RESERVED",
      "UNDER_MAINTENANCE",
      "WITH_CUSTOMER"
    ]);
  });

  it("validates a cylinder record", () => {
    const parsed = cylinderSchema.safeParse({
      serialNumber: "CYL-TEST-001",
      barcode: "RFID-TEST-001",
      skuId: "sku-id",
      manufactureDate: "2024-01-01",
      inspectionDueDate: "2027-01-01",
      currentLocationId: "location-id",
      status: "FILLED",
      notes: "Test cylinder"
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid cylinder input", () => {
    const parsed = cylinderSchema.safeParse({
      serialNumber: "A",
      skuId: "",
      currentLocationId: "",
      status: "LOST"
    });

    expect(parsed.success).toBe(false);
  });

  it("validates opening balance entries", () => {
    const parsed = openingBalanceSchema.safeParse({
      reference: "OB-TEST",
      skuId: "sku-id",
      locationId: "location-id",
      status: "EMPTY",
      quantity: 2,
      serialPrefix: "OBTEST"
    });

    expect(parsed.success).toBe(true);
  });

  it("limits inventory management to Admin and Warehouse Manager", () => {
    expect(canManageInventory("ADMIN")).toBe(true);
    expect(canManageInventory("WAREHOUSE_MANAGER")).toBe(true);
    expect(canManageInventory("AUDITOR")).toBe(false);
    expect(canViewInventory("AUDITOR")).toBe(true);
    expect(canViewInventory("RSO")).toBe(false);
  });

  it("supports the required inventory movement types", () => {
    expect(inventoryMovementTypes).toEqual([
      "OPENING_BALANCE",
      "RECEIPT",
      "ISSUE",
      "TRANSFER",
      "RETURN_FROM_CUSTOMER",
      "RETURN_FROM_VEHICLE",
      "ADJUSTMENT",
      "DAMAGED_QUARANTINE",
      "MAINTENANCE_TRANSFER"
    ]);
  });

  it("validates movement requests and source requirements", () => {
    const validTransfer = inventoryMovementSchema.safeParse({
      reference: "TRF-TEST",
      type: "TRANSFER",
      skuId: "sku-id",
      sourceLocationId: "warehouse-id",
      destinationLocationId: "retail-id",
      sourceStatus: "FILLED",
      destinationStatus: "FILLED",
      requestedQuantity: 2
    });
    const invalidTransfer = inventoryMovementSchema.safeParse({
      reference: "TRF-BAD",
      type: "TRANSFER",
      skuId: "sku-id",
      destinationLocationId: "retail-id",
      destinationStatus: "FILLED",
      requestedQuantity: 2
    });

    expect(validTransfer.success).toBe(true);
    expect(invalidTransfer.success).toBe(false);
  });

  it("applies movement role permissions", () => {
    expect(canViewInventoryMovements("AUDITOR")).toBe(true);
    expect(canRequestInventoryMovements("RSO")).toBe(true);
    expect(canRequestInventoryMovements("CUSTOMER")).toBe(false);
    expect(canApproveInventoryMovements("WAREHOUSE_MANAGER")).toBe(true);
    expect(canApproveInventoryMovements("MSO")).toBe(false);
    expect(canCreateReceiptCylinders("RECEIPT")).toBe(true);
    expect(canCreateReceiptCylinders("TRANSFER")).toBe(false);
  });
});
