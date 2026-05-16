import { describe, expect, it } from "vitest";
import {
  canManageRefillSales,
  canViewRefillSales,
  formatPaymentMethod,
  paymentMethods,
  refillOrderSchema
} from "@/lib/refill-sales";

describe("RSO refill sales", () => {
  it("supports the required payment placeholders", () => {
    expect(paymentMethods).toEqual(["CASH", "MPESA", "CARD"]);
    expect(formatPaymentMethod("MPESA")).toBe("Mpesa");
  });

  it("validates refill orders for existing customers", () => {
    const parsed = refillOrderSchema.safeParse({
      customerId: "customer-id",
      skuId: "sku-id",
      filledCylinderCode: "FULL-001",
      emptyReturnCylinderCode: "EMPTY-001",
      paymentMethod: "CASH",
      paymentReference: "CASH-001"
    });

    expect(parsed.success).toBe(true);
  });

  it("validates refill orders with new customer registration", () => {
    const parsed = refillOrderSchema.safeParse({
      customer: {
        name: "Walk In Customer",
        phone: "+254700900100",
        proofReference: "ID-900100",
        category: "DOMESTIC",
        address: "Mombasa Depot",
        status: "ACTIVE"
      },
      skuId: "sku-id",
      filledCylinderCode: "FULL-002",
      emptyReturnCylinderCode: "EMPTY-002",
      paymentMethod: "MPESA"
    });

    expect(parsed.success).toBe(true);
  });

  it("validates no-QR empty returns with serial and size", () => {
    const parsed = refillOrderSchema.safeParse({
      customerId: "customer-id",
      skuId: "sku-id",
      filledCylinderCode: "FULL-004",
      emptyReturnNoQr: true,
      emptyReturnSerialNumber: "EMPTY-NOQR-004",
      emptyReturnSizeKg: 6,
      paymentMethod: "CASH"
    });

    expect(parsed.success).toBe(true);
    expect(refillOrderSchema.safeParse({
      customerId: "customer-id",
      skuId: "sku-id",
      filledCylinderCode: "FULL-005",
      emptyReturnNoQr: true,
      paymentMethod: "CASH"
    }).success).toBe(false);
  });

  it("requires a customer and limits refill creation to RSO/Admin", () => {
    expect(refillOrderSchema.safeParse({ skuId: "sku-id", paymentMethod: "CARD", filledCylinderCode: "FULL-003", emptyReturnCylinderCode: "EMPTY-003" }).success).toBe(false);
    expect(refillOrderSchema.safeParse({ customerId: "customer-id", skuId: "sku-id", paymentMethod: "CARD", filledCylinderCode: "SAME", emptyReturnCylinderCode: " same " }).success).toBe(false);
    expect(canManageRefillSales("RSO")).toBe(true);
    expect(canManageRefillSales("ADMIN")).toBe(true);
    expect(canManageRefillSales("MSO")).toBe(false);
    expect(canViewRefillSales("AUDITOR")).toBe(true);
  });
});
