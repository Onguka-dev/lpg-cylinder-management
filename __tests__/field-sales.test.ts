import { describe, expect, it } from "vitest";
import {
  canManageFieldSales,
  canViewFieldSales,
  fieldDeliveryStatuses,
  fieldSaleSchema,
  generateFieldSaleNumber
} from "@/lib/field-sales";

describe("MSO field sales", () => {
  it("supports the required delivery status placeholders", () => {
    expect(fieldDeliveryStatuses).toEqual(["DELIVERED", "PARTIAL", "FAILED", "RESCHEDULED"]);
  });

  it("validates an instant sale for an existing customer", () => {
    const parsed = fieldSaleSchema.safeParse({
      customerId: "customer-id",
      skuId: "sku-id",
      paymentMethod: "MPESA",
      paymentReference: "MPESA-123",
      deliveryStatus: "DELIVERED"
    });

    expect(parsed.success).toBe(true);
  });

  it("validates field customer registration during a sale", () => {
    const parsed = fieldSaleSchema.safeParse({
      customer: {
        name: "Field Customer",
        phone: "+254700900100",
        proofReference: "ID-900100",
        category: "DOMESTIC",
        address: "Route stop 12",
        status: "ACTIVE"
      },
      skuId: "sku-id",
      paymentMethod: "CASH",
      deliveryStatus: "PARTIAL",
      discrepancyReport: "Customer paid cash; balance follow-up placeholder."
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects missing customer and invalid payment input", () => {
    expect(fieldSaleSchema.safeParse({ skuId: "sku-id", paymentMethod: "CHEQUE", deliveryStatus: "DELIVERED" }).success).toBe(false);
    expect(fieldSaleSchema.safeParse({ customerId: "", skuId: "", paymentMethod: "CASH", deliveryStatus: "DELIVERED" }).success).toBe(false);
  });

  it("applies role permissions for field sales", () => {
    expect(canManageFieldSales("ADMIN")).toBe(true);
    expect(canManageFieldSales("MSO")).toBe(true);
    expect(canManageFieldSales("RSO")).toBe(false);
    expect(canViewFieldSales("AUDITOR")).toBe(true);
    expect(canViewFieldSales("CUSTOMER")).toBe(false);
  });

  it("generates field sale numbers with the expected prefix", () => {
    expect(generateFieldSaleNumber()).toMatch(/^FS-\d{8}-\d{9}$/);
  });
});
