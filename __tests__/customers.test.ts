import { describe, expect, it } from "vitest";
import {
  canManageCustomers,
  canViewCustomers,
  customerSchema,
  seedCustomers
} from "@/lib/customers";

describe("customer management", () => {
  it("validates a complete customer record", () => {
    const parsed = customerSchema.safeParse({
      name: "Test Customer",
      phone: "+254700000001",
      proofReference: "ID-TEST-001",
      kraPin: "P051234567A",
      category: "DOMESTIC",
      address: "Nairobi",
      latitude: -1.2921,
      longitude: 36.8219,
      status: "ACTIVE",
      creditLimit: 1000,
      notes: "Test notes",
      documentPlaceholder: "KYC document placeholder"
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid customer input", () => {
    const parsed = customerSchema.safeParse({
      name: "A",
      phone: "abc",
      proofReference: "X",
      category: "DOMESTIC",
      address: "N",
      status: "ACTIVE",
      creditLimit: -1
    });

    expect(parsed.success).toBe(false);
  });

  it("allows Admin, RSO, and MSO to manage customers", () => {
    expect(canManageCustomers("ADMIN")).toBe(true);
    expect(canManageCustomers("RSO")).toBe(true);
    expect(canManageCustomers("MSO")).toBe(true);
    expect(canManageCustomers("AUDITOR")).toBe(false);
  });

  it("allows Auditor to view customers only", () => {
    expect(canViewCustomers("AUDITOR")).toBe(true);
    expect(canViewCustomers("WAREHOUSE_MANAGER")).toBe(false);
  });

  it("seeds domestic, commercial, and industrial customer categories", () => {
    expect(new Set(seedCustomers.map((customer) => customer.category))).toEqual(
      new Set(["DOMESTIC", "COMMERCIAL", "INDUSTRIAL"])
    );
  });
});
