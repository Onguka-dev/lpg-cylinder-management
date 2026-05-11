import { describe, expect, it } from "vitest";
import {
  canManageInventory,
  canViewInventory,
  assertNoOpenCustomerCustody,
  assertSingleCurrentLocation,
  cylinderSchema,
  cylinderStatuses,
  isCylinderBlockedForSaleOrDispatch,
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
    ]);
  });

  it("validates a cylinder record", () => {
    const parsed = cylinderSchema.safeParse({
      serialNumber: "CYL-TEST-001",
      barcode: "RFID-TEST-001",
      factorySerialNo: "FACTORY-TEST-001",
      qrCode: "QR-TEST-001",
      cylinderSizeKg: 13,
      manufacturer: "Demo manufacturer",
      skuId: "sku-id",
      manufactureDate: "2024-01-01",
      inspectionDueDate: "2027-01-01",
      currentLocationId: "location-id",
      status: "FILLED",
      activeStatus: true,
      companyOwned: true,
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

  it("limits inventory management to Admin, Warehouse Manager, and Plant Manager", () => {
    expect(canManageInventory("ADMIN")).toBe(true);
    expect(canManageInventory("WAREHOUSE_MANAGER")).toBe(true);
    expect(canManageInventory("PLANT_MANAGER")).toBe(true);
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
    expect(canRequestInventoryMovements("SERVICE_CENTRE_STAFF")).toBe(true);
    expect(canRequestInventoryMovements("CUSTOMER")).toBe(false);
    expect(canApproveInventoryMovements("WAREHOUSE_MANAGER")).toBe(true);
    expect(canApproveInventoryMovements("PLANT_MANAGER")).toBe(true);
    expect(canApproveInventoryMovements("MSO")).toBe(false);
    expect(canCreateReceiptCylinders("RECEIPT")).toBe(true);
    expect(canCreateReceiptCylinders("TRANSFER")).toBe(false);
  });

  it("guards single-location and custody invariants", () => {
    expect(() => assertSingleCurrentLocation({ currentLocationId: "loc" })).not.toThrow();
    expect(() => assertSingleCurrentLocation({ currentLocationId: null })).toThrow("CYLINDER_LOCATION_REQUIRED");
    expect(() => assertNoOpenCustomerCustody(0)).not.toThrow();
    expect(() => assertNoOpenCustomerCustody(1)).toThrow("CYLINDER_ALREADY_IN_CUSTOMER_CUSTODY");
    expect(isCylinderBlockedForSaleOrDispatch({ status: "QUARANTINED" })).toBe(true);
    expect(isCylinderBlockedForSaleOrDispatch({ status: "FILLED", activeStatus: true })).toBe(false);
  });
});
