import { describe, expect, it } from "vitest";
import { cylinderStatuses } from "@/lib/inventory";
import {
  canManageSellingPointDispatch,
  canReceiveSellingPointDispatch,
  canViewSellingPointDispatch,
  findDuplicateCodes,
  formatSellingPointLabel,
  getDispatchableSourceStatuses,
  getSellingPointRouteForDestination,
  getSellingPointRouteForSource,
  isWarehouseDestination,
  nairobiSellingPointDestinationCodes,
  nairobiSellingPointSourceCodes,
  normalizeCodeList,
  sellingPointDestinationCodes,
  sellingPointSourceCodes,
  sellingPointDispatchSchema,
  sellingPointReceiveSchema,
  sellingPointSourceCode,
  sourceCanDispatchToDestination
} from "@/lib/selling-point-distribution";

describe("selling point distribution workflow", () => {
  it("adds selling point stock status", () => {
    expect(cylinderStatuses).toContain("FILLED_AT_SELLING_POINT");
  });

  it("defines Wandiege source and allowed destinations", () => {
    expect(sellingPointSourceCode).toBe("WH-WANDIEGE-MAIN");
    expect(sellingPointSourceCodes).toContain("WH-LAKE-GAS-NBO");
    expect(sellingPointSourceCodes).toContain("WH-OILCOM-NBO");
    expect(sellingPointDestinationCodes).toContain("WH-UGUNJA-SECONDARY");
    expect(sellingPointDestinationCodes).toContain("VAN-KDK-152E");
    expect(sellingPointDestinationCodes).toContain("SC-POLYVIEW");
    expect(sellingPointDestinationCodes).toContain("SC-KAKAMEGA");
    expect(nairobiSellingPointSourceCodes).toEqual(["WH-LAKE-GAS-NBO", "WH-OILCOM-NBO"]);
    expect(nairobiSellingPointDestinationCodes).toEqual([
      "SC-GARDEN-ESTATE",
      "SC-JOGOO-ROAD",
      "SC-NAIROBI-WEST",
      "SC-DAGORETTI",
      "SC-MLOLONGO"
    ]);
  });

  it("validates dispatch and receipt scan payloads", () => {
    expect(sellingPointDispatchSchema.safeParse({
      reference: "DIST-WAN-001",
      sourceLocationId: "source-id",
      destinationLocationId: "destination-id",
      cylinderCodes: ["BAR-1"],
      vehicle: "KDK 152E",
      driverSalesRep: "Sales Rep",
      route: "Western Route",
      dispatchOfficerName: "Dispatch Officer",
      receivingOfficerName: "Receiving Officer",
      transferDateTime: "2026-05-11T10:00"
    }).success).toBe(true);
    expect(sellingPointDispatchSchema.safeParse({ reference: "BAD", cylinderCodes: [] }).success).toBe(false);
    expect(sellingPointReceiveSchema.safeParse({ receivedCodes: ["BAR-1"] }).success).toBe(true);
  });

  it("normalizes scan codes and identifies warehouse destination status rules", () => {
    expect(normalizeCodeList([" a ", "A", "b"])).toEqual(["A", "B"]);
    expect(findDuplicateCodes(["a", " A "])).toBe("A");
    expect(isWarehouseDestination("WH-UGUNJA-SECONDARY")).toBe(true);
    expect(isWarehouseDestination("SC-POLYVIEW")).toBe(false);
    expect(formatSellingPointLabel("FILLED_AT_SELLING_POINT")).toBe("Filled At Selling Point");
  });

  it("keeps Nairobi and Western dispatch routes separate", () => {
    expect(getSellingPointRouteForSource("WH-LAKE-GAS-NBO")?.key).toBe("NAIROBI");
    expect(getSellingPointRouteForDestination("SC-DAGORETTI")?.key).toBe("NAIROBI");
    expect(sourceCanDispatchToDestination("WH-LAKE-GAS-NBO", "SC-DAGORETTI")).toBe(true);
    expect(sourceCanDispatchToDestination("WH-OILCOM-NBO", "SC-GARDEN-ESTATE")).toBe(true);
    expect(sourceCanDispatchToDestination("WH-WANDIEGE-MAIN", "SC-DAGORETTI")).toBe(false);
    expect(sourceCanDispatchToDestination("WH-LAKE-GAS-NBO", "SC-POLYVIEW")).toBe(false);
    expect(getDispatchableSourceStatuses("WH-WANDIEGE-MAIN")).toEqual(["FILLED_AT_WAREHOUSE"]);
    expect(getDispatchableSourceStatuses("WH-LAKE-GAS-NBO")).toEqual(["FILLED_AT_WAREHOUSE", "FILLED"]);
  });

  it("aligns permissions by role", () => {
    expect(canManageSellingPointDispatch("ADMIN")).toBe(true);
    expect(canManageSellingPointDispatch("WAREHOUSE_MANAGER")).toBe(true);
    expect(canManageSellingPointDispatch("MSO")).toBe(false);
    expect(canReceiveSellingPointDispatch("MSO")).toBe(true);
    expect(canReceiveSellingPointDispatch("SERVICE_CENTRE_STAFF")).toBe(true);
    expect(canViewSellingPointDispatch("AUDITOR")).toBe(true);
  });
});
