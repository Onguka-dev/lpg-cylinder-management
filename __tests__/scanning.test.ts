import { describe, expect, it, vi } from "vitest";
import {
  isDuplicateInBatch,
  scanActionTypes,
  scannerValidationSchema,
  validateAndLogCylinderScan
} from "@/lib/scanning";

const validCylinder = {
  id: "cylinder-1",
  serialNumber: "CYL-001",
  barcode: "BAR-001",
  factorySerialNo: "FACT-001",
  qrCode: "QR-001",
  status: "FILLED",
  activeStatus: true,
  blockedReason: null,
  unsafeStatus: false,
  quarantinedStatus: false,
  maintenanceStatus: "NONE",
  expiryDate: null,
  hydroTestDueDate: null,
  currentLocationId: "loc-1",
  sku: { name: "13kg LPG" },
  currentLocation: { name: "Wandiege Main Warehouse" }
};

describe("scanner framework", () => {
  it("supports all shared scan actions", () => {
    expect(scanActionTypes).toEqual([
      "RECEIPT",
      "TRANSFER_DISPATCH",
      "TRANSFER_RECEIVE",
      "SALE",
      "CUSTOMER_RETURN",
      "NON_CODED_INTAKE",
      "REPORT_LOOKUP",
      "MOBILE_VERIFY"
    ]);
  });

  it("validates scan input", () => {
    expect(
      scannerValidationSchema.safeParse({
        barcode: "BAR-001",
        action: "TRANSFER_DISPATCH",
        expectedSourceLocationId: "loc-1",
        expectedStatus: "FILLED"
      }).success
    ).toBe(true);
    expect(scannerValidationSchema.safeParse({ barcode: "", action: "TRANSFER_DISPATCH" }).success).toBe(false);
  });

  it("detects duplicates in the current batch", () => {
    expect(isDuplicateInBatch("bar-001", [" BAR-001 "])).toBe(true);
    expect(isDuplicateInBatch("bar-002", ["BAR-001"])).toBe(false);
  });

  it("permits a valid scan and logs it", async () => {
    const db = {
      cylinder: { findFirst: vi.fn().mockResolvedValue(validCylinder) },
      scanEvent: { create: vi.fn().mockResolvedValue({ id: "scan-1" }) }
    };

    const result = await validateAndLogCylinderScan(db as never, {
      barcode: "BAR-001",
      action: "TRANSFER_DISPATCH",
      expectedSourceLocationId: "loc-1",
      expectedStatus: "FILLED",
      batchBarcodeValues: []
    });

    expect(result.ok).toBe(true);
    expect(result.result).toBe("PERMITTED");
    expect(db.scanEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        barcode: "BAR-001",
        result: "PERMITTED",
        cylinderId: "cylinder-1"
      })
    }));
  });

  it("blocks duplicate, wrong-location, and missing-cylinder scans without stock updates", async () => {
    const duplicateDb = {
      cylinder: { findFirst: vi.fn() },
      scanEvent: { create: vi.fn().mockResolvedValue({ id: "scan-duplicate" }) }
    };
    const duplicate = await validateAndLogCylinderScan(duplicateDb as never, {
      barcode: "BAR-001",
      action: "TRANSFER_DISPATCH",
      batchBarcodeValues: ["BAR-001"]
    });

    expect(duplicate.result).toBe("ALREADY_SCANNED");
    expect(duplicateDb.cylinder.findFirst).not.toHaveBeenCalled();
    expect(duplicateDb.scanEvent.create).toHaveBeenCalled();

    const wrongLocationDb = {
      cylinder: { findFirst: vi.fn().mockResolvedValue(validCylinder) },
      scanEvent: { create: vi.fn().mockResolvedValue({ id: "scan-wrong-location" }) }
    };
    const wrongLocation = await validateAndLogCylinderScan(wrongLocationDb as never, {
      barcode: "BAR-001",
      action: "TRANSFER_DISPATCH",
      expectedSourceLocationId: "loc-2",
      expectedStatus: "FILLED",
      batchBarcodeValues: []
    });

    expect(wrongLocation.result).toBe("WRONG_LOCATION");
    expect(wrongLocation.ok).toBe(false);

    const missingDb = {
      cylinder: { findFirst: vi.fn().mockResolvedValue(null) },
      scanEvent: { create: vi.fn().mockResolvedValue({ id: "scan-missing" }) }
    };
    const missing = await validateAndLogCylinderScan(missingDb as never, {
      barcode: "MISSING",
      action: "MOBILE_VERIFY",
      batchBarcodeValues: []
    });

    expect(missing.result).toBe("CYLINDER_NOT_FOUND");
    expect(missingDb.scanEvent.create).toHaveBeenCalled();
  });
});
