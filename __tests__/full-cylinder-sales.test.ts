import { describe, expect, it } from "vitest";
import {
  canManageFullCylinderSales,
  canViewFullCylinderSales,
  fullCylinderSaleSchema,
  generateFullCylinderSaleReference
} from "@/lib/full-cylinder-sales";

describe("full cylinder plus gas sales", () => {
  it("validates a registered customer and scanned cylinder sale", () => {
    const parsed = fullCylinderSaleSchema.safeParse({
      customer: {
        name: "Walk In Buyer",
        phone: "+254700123456",
        proofReference: "ID-123456",
        category: "DOMESTIC",
        address: "Polyview service centre",
        status: "ACTIVE"
      },
      locationId: "location-id",
      cylinderCode: "P7BC-TEST-13KG",
      paymentMethod: "CASH",
      cylinderAmount: 2500,
      gasAmount: 1200
    });

    expect(parsed.success).toBe(true);
  });

  it("requires either an existing customer or customer registration details", () => {
    expect(fullCylinderSaleSchema.safeParse({
      locationId: "location-id",
      cylinderCode: "P7BC-TEST-13KG",
      paymentMethod: "MPESA",
      cylinderAmount: 2500,
      gasAmount: 1200
    }).success).toBe(false);
  });

  it("keeps selling point permissions aligned with the route", () => {
    expect(canManageFullCylinderSales("ADMIN")).toBe(true);
    expect(canManageFullCylinderSales("RSO")).toBe(true);
    expect(canManageFullCylinderSales("MSO")).toBe(true);
    expect(canManageFullCylinderSales("SERVICE_CENTRE_STAFF")).toBe(true);
    expect(canManageFullCylinderSales("AUDITOR")).toBe(false);
    expect(canViewFullCylinderSales("AUDITOR")).toBe(true);
  });

  it("generates traceable sale references", () => {
    expect(generateFullCylinderSaleReference("FCS")).toMatch(/^FCS-\d{8}-\d{9}$/);
  });
});
