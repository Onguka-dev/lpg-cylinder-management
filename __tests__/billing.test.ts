import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  billingPaymentMethods,
  billingPaymentSchema,
  calculateTax,
  canManageBilling,
  canViewBilling,
  formatBillingLabel,
  invoiceCreateSchema,
  invoiceStatusForAmounts
} from "@/lib/billing";

describe("billing and payments", () => {
  it("supports required payment methods", () => {
    expect(billingPaymentMethods).toEqual(["CASH", "MPESA", "CARD", "ONLINE"]);
  });

  it("validates invoice source requirements", () => {
    expect(invoiceCreateSchema.safeParse({ sourceType: "CUSTOMER_ORDER", customerOrderId: "order-id" }).success).toBe(true);
    expect(invoiceCreateSchema.safeParse({ sourceType: "CUSTOMER_ORDER" }).success).toBe(false);
    expect(invoiceCreateSchema.safeParse({ sourceType: "RETAIL_REFILL", refillOrderId: "refill-id" }).success).toBe(true);
  });

  it("validates payment capture", () => {
    expect(billingPaymentSchema.safeParse({ amount: 500, method: "MPESA", reference: "ABC123" }).success).toBe(true);
    expect(billingPaymentSchema.safeParse({ amount: 0, method: "CASH" }).success).toBe(false);
    expect(billingPaymentSchema.safeParse({ amount: 100, method: "CHEQUE" }).success).toBe(false);
  });

  it("calculates tax and invoice status from payments", () => {
    expect(calculateTax(new Prisma.Decimal(1000)).toString()).toBe("160");
    expect(invoiceStatusForAmounts(new Prisma.Decimal(1000), new Prisma.Decimal(0))).toBe("ISSUED");
    expect(invoiceStatusForAmounts(new Prisma.Decimal(1000), new Prisma.Decimal(500))).toBe("PARTIALLY_PAID");
    expect(invoiceStatusForAmounts(new Prisma.Decimal(1000), new Prisma.Decimal(1000))).toBe("PAID");
  });

  it("applies billing permissions", () => {
    expect(canManageBilling("ADMIN")).toBe(true);
    expect(canManageBilling("RSO")).toBe(true);
    expect(canManageBilling("AUDITOR")).toBe(false);
    expect(canViewBilling("AUDITOR")).toBe(true);
    expect(canViewBilling("CUSTOMER")).toBe(false);
  });

  it("formats billing labels", () => {
    expect(formatBillingLabel("PARTIALLY_PAID")).toBe("Partially Paid");
  });
});
