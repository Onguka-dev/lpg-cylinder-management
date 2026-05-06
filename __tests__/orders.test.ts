import { describe, expect, it } from "vitest";
import {
  canManageOrders,
  canModifyOrderStatus,
  canViewOrders,
  nextStatuses,
  orderChannels,
  orderSchema,
  orderStatuses
} from "@/lib/orders";

describe("order management", () => {
  it("supports the required channels and statuses", () => {
    expect(orderChannels).toEqual(["MOBILE_APP", "WEB", "RSO", "MSO", "CALL_CENTRE"]);
    expect(orderStatuses).toEqual(["PENDING", "CONFIRMED", "ASSIGNED", "DISPATCHED", "DELIVERED", "CLOSED", "CANCELLED"]);
  });

  it("validates bulk orders with multiple line items", () => {
    const parsed = orderSchema.safeParse({
      customerId: "customer-id",
      channel: "CALL_CENTRE",
      isPriority: true,
      deliveryZoneId: "zone-id",
      expectedDeliveryDate: "2026-05-10",
      items: [
        { skuId: "sku-6kg", quantity: 3 },
        { skuId: "sku-13kg", quantity: 2 }
      ]
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid order input", () => {
    expect(orderSchema.safeParse({ customerId: "", channel: "WEB", items: [] }).success).toBe(false);
  });

  it("limits modification after dispatch and exposes valid workflow steps", () => {
    expect(canModifyOrderStatus("PENDING")).toBe(true);
    expect(canModifyOrderStatus("DISPATCHED")).toBe(false);
    expect(nextStatuses("PENDING")).toEqual(["CONFIRMED", "CANCELLED"]);
    expect(nextStatuses("DISPATCHED")).toEqual(["DELIVERED"]);
  });

  it("applies order role permissions", () => {
    expect(canManageOrders("RSO")).toBe(true);
    expect(canManageOrders("MSO")).toBe(true);
    expect(canManageOrders("WAREHOUSE_MANAGER")).toBe(false);
    expect(canViewOrders("AUDITOR")).toBe(true);
  });
});
