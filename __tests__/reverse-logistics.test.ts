import { describe, expect, it } from "vitest";
import {
  canDispatchEmptyReturns,
  canManageEmptyReturns,
  canReceiveEmptyReturns,
  emptyReturnConditions,
  emptyReturnSchema,
  emptyReturnTransferSchema,
  isDamagedReturnCondition,
  parseConditionLabel,
  reverseWarehouseCodes
} from "@/lib/reverse-logistics";

describe("empty returns reverse logistics", () => {
  it("supports required return conditions and warehouse destinations", () => {
    expect(emptyReturnConditions).toEqual(["GOOD", "DAMAGED", "LEAKING", "MISSING_VALVE", "WRONG_BRAND", "UNCLEAR_SERIAL", "NON_CODED"]);
    expect(reverseWarehouseCodes).toContain("WH-WANDIEGE-MAIN");
    expect(reverseWarehouseCodes).toContain("WH-UGUNJA-SECONDARY");
    expect(reverseWarehouseCodes).toContain("WH-LAKE-GAS-NBO");
    expect(reverseWarehouseCodes).toContain("WH-OILCOM-NBO");
    expect(isDamagedReturnCondition("LEAKING")).toBe(true);
    expect(isDamagedReturnCondition("GOOD")).toBe(false);
    expect(parseConditionLabel("EMPTY_AT_WAREHOUSE")).toBe("Empty At Warehouse");
  });

  it("validates customer empty returns with scanned and non-coded cylinders", () => {
    expect(emptyReturnSchema.safeParse({
      customerId: "customer-id",
      cylinderCode: "RET-EMPTY-001",
      condition: "GOOD"
    }).success).toBe(true);
    expect(emptyReturnSchema.safeParse({
      customerPhone: "+254700000001",
      noCode: true,
      serialNumber: "NOQR-001",
      cylinderSizeKg: 13,
      condition: "UNCLEAR_SERIAL"
    }).success).toBe(true);
    expect(emptyReturnSchema.safeParse({ customerId: "customer-id", noCode: true, condition: "GOOD" }).success).toBe(false);
  });

  it("validates empty return transfer dispatches", () => {
    const parsed = emptyReturnTransferSchema.safeParse({
      reference: "ERT-001",
      destinationLocationId: "warehouse-id",
      cylinderCodes: ["EMPTY-001", "EMPTY-002"],
      vehicle: "KDK 152E",
      driverSalesRep: "Sales rep",
      route: "Western",
      dispatchOfficerName: "Dispatch officer",
      receivingOfficerName: "Warehouse receiver",
      transferDateTime: "2026-05-16T10:00"
    });
    expect(parsed.success).toBe(true);
  });

  it("keeps role permissions aligned", () => {
    expect(canManageEmptyReturns("RSO")).toBe(true);
    expect(canManageEmptyReturns("MSO")).toBe(true);
    expect(canDispatchEmptyReturns("SERVICE_CENTRE_STAFF")).toBe(true);
    expect(canReceiveEmptyReturns("WAREHOUSE_MANAGER")).toBe(true);
    expect(canReceiveEmptyReturns("RSO")).toBe(false);
    expect(canManageEmptyReturns("AUDITOR")).toBe(false);
  });
});
