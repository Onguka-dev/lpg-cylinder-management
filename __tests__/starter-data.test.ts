import { describe, expect, it } from "vitest";
import {
  starterLocations,
  starterRoles,
  starterSkus,
  starterUsers,
  validateStarterData
} from "@/lib/starter-data";

describe("starter data", () => {
  it("contains the Stage 0 roles", () => {
    expect(starterRoles.map((role) => role.name)).toEqual([
      "ADMIN",
      "WAREHOUSE_MANAGER",
      "RSO",
      "MSO",
      "AUDITOR",
      "CUSTOMER"
    ]);
  });

  it("contains the requested LPG SKU sizes", () => {
    expect(starterSkus.map((sku) => sku.capacityKg)).toEqual([6, 13, 50]);
  });

  it("validates the starter data shape", () => {
    expect(validateStarterData()).toEqual({
      roleCount: starterRoles.length,
      locationCount: starterLocations.length,
      userCount: starterUsers.length,
      skuCount: starterSkus.length
    });
  });
});
