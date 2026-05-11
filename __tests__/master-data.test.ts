import { describe, expect, it } from "vitest";
import {
  fromSlug,
  masterDataConfigs,
  masterDataRecordSchema,
  seedMasterDataRecords,
  toSlug
} from "@/lib/master-data";

describe("master data configuration", () => {
  it("covers all Stage 2 master data areas", () => {
    expect(masterDataConfigs).toHaveLength(17);
    expect(masterDataConfigs.map((config) => config.type)).toContain("SKU_MASTER");
    expect(masterDataConfigs.map((config) => config.type)).toContain("VEHICLE");
    expect(masterDataConfigs.map((config) => config.type)).toContain("STOCK_THRESHOLD");
  });

  it("round-trips URL slugs", () => {
    expect(toSlug("DAMAGED_QUARANTINE_LOCATION")).toBe("damaged-quarantine-location");
    expect(fromSlug("damaged-quarantine-location")).toBe("DAMAGED_QUARANTINE_LOCATION");
  });

  it("validates good master data input", () => {
    const parsed = masterDataRecordSchema.safeParse({
      type: "PRICE",
      code: "PRICE-TEST",
      name: "Test Price",
      amount: 100
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid codes and negative amounts", () => {
    const parsed = masterDataRecordSchema.safeParse({
      type: "PRICE",
      code: "bad code!",
      name: "X",
      amount: -10
    });

    expect(parsed.success).toBe(false);
  });

  it("has seed records for every master data type", () => {
    const seededTypes = new Set(seedMasterDataRecords.map((record) => record.type));

    for (const config of masterDataConfigs) {
      expect(seededTypes.has(config.type)).toBe(true);
    }
  });

  it("seeds Wells Gas operating locations with movement metadata", () => {
    const codes = new Set(seedMasterDataRecords.map((record) => record.code));
    expect(Array.from(codes)).toEqual(expect.arrayContaining([
      "WH-WANDIEGE-MAIN",
      "WH-LAKE-GAS-NBO",
      "WH-OILCOM-NBO",
      "PLANT-SABUNI-ROAD",
      "WH-UGUNJA-SECONDARY",
      "VAN-KDK-152E",
      "VAN-KCX-301Q",
      "TUKTUK",
      "SC-KIBUYE",
      "SC-MLOLONGO",
      "LOC-CUSTOMER-VIRTUAL",
      "DMG-WANDIEGE"
    ]));

    const wandiege = seedMasterDataRecords.find((record) => record.code === "WH-WANDIEGE-MAIN");
    expect(wandiege?.metadata).toMatchObject({
      locationType: "MAIN_WAREHOUSE",
      activeStatus: "ACTIVE"
    });
  });
});
