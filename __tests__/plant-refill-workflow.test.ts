import { describe, expect, it } from "vitest";
import {
  canManagePlantTransfers,
  canViewPlantTransfers,
  findDuplicateCodes,
  formatPlantWorkflowLabel,
  normalizeCodeList,
  plantLineStatuses,
  plantReceiveSchema,
  plantTransferSchema,
  plantTransferStatuses,
  refillBatchSchema
} from "@/lib/plant-refill-workflow";
import { cylinderStatuses } from "@/lib/inventory";

describe("plant refill workflow", () => {
  it("adds explicit in-transit and filled-at-warehouse statuses", () => {
    expect(cylinderStatuses).toContain("EMPTY_IN_TRANSIT");
    expect(cylinderStatuses).toContain("FILLED_IN_TRANSIT");
    expect(cylinderStatuses).toContain("FILLED_AT_WAREHOUSE");
  });

  it("defines controlled plant workflow statuses", () => {
    expect(plantTransferStatuses).toEqual([
      "DRAFT",
      "DISPATCHED_TO_PLANT",
      "RECEIVED_AT_PLANT",
      "VARIANCE_LOGGED",
      "REFILLED",
      "RETURN_DISPATCHED",
      "COMPLETED"
    ]);
    expect(plantLineStatuses).toContain("MISSING");
    expect(plantLineStatuses).toContain("DAMAGED");
    expect(plantLineStatuses).toContain("RETURNED_TO_WAREHOUSE");
  });

  it("validates transfer dispatch input and scan lists", () => {
    expect(
      plantTransferSchema.safeParse({
        reference: "PLANT-TRF-TEST",
        cylinderCodes: ["EMPTY-001", "EMPTY-002"],
        vehicle: "KDK 152E",
        driver: "Driver",
        sealNumber: "SEAL-001"
      }).success
    ).toBe(true);
    expect(plantTransferSchema.safeParse({ reference: "BAD", cylinderCodes: [], vehicle: "", driver: "", sealNumber: "" }).success).toBe(false);
    expect(plantReceiveSchema.safeParse({ receivedCodes: ["A"], damagedCodes: ["B"], extraCodes: ["C"] }).success).toBe(true);
  });

  it("normalizes and detects duplicate scanned codes", () => {
    expect(normalizeCodeList([" a ", "A", "b"])).toEqual(["A", "B"]);
    expect(findDuplicateCodes(["a", " A "])).toBe("A");
    expect(findDuplicateCodes(["a", "b"])).toBeNull();
  });

  it("requires a passed quality check for refill batches", () => {
    expect(refillBatchSchema.safeParse({
      reference: "RB-001",
      transferLineIds: ["line-1"],
      qualityInspectionStatus: "PASSED"
    }).success).toBe(true);
    expect(refillBatchSchema.safeParse({
      reference: "RB-001",
      transferLineIds: [],
      qualityInspectionStatus: "PASSED"
    }).success).toBe(false);
  });

  it("aligns permissions and labels with inventory roles", () => {
    expect(canManagePlantTransfers("ADMIN")).toBe(true);
    expect(canManagePlantTransfers("WAREHOUSE_MANAGER")).toBe(true);
    expect(canManagePlantTransfers("PLANT_MANAGER")).toBe(true);
    expect(canManagePlantTransfers("AUDITOR")).toBe(false);
    expect(canViewPlantTransfers("AUDITOR")).toBe(true);
    expect(formatPlantWorkflowLabel("RETURN_DISPATCHED")).toBe("Return Dispatched");
  });
});
