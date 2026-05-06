import { describe, expect, it } from "vitest";
import {
  canManageDeliveries,
  canUpdateDeliveryStatus,
  canViewDeliveries,
  deliveryAssignmentSchema,
  deliveryStatusSchema,
  deliveryStatuses,
  failedDeliveryReasons,
  nextDeliveryStatuses,
  orderStatusForDelivery
} from "@/lib/deliveries";

describe("delivery management", () => {
  it("supports the required delivery statuses and failed reasons", () => {
    expect(deliveryStatuses).toEqual(["ASSIGNED", "LOADING_CONFIRMED", "CUSTOMER_ARRIVAL", "DELIVERED", "FAILED", "RETURNED", "EXCEPTION"]);
    expect(failedDeliveryReasons).toEqual(["CUSTOMER_UNAVAILABLE", "DAMAGED_CYLINDER", "WRONG_LOCATION", "PAYMENT_ISSUE", "PARTIAL_DELIVERY"]);
  });

  it("validates delivery assignment", () => {
    expect(deliveryAssignmentSchema.safeParse({ orderId: "order-id", driverName: "Driver One" }).success).toBe(true);
    expect(deliveryAssignmentSchema.safeParse({ orderId: "", driverName: "D" }).success).toBe(false);
  });

  it("validates proof of delivery input", () => {
    expect(deliveryStatusSchema.safeParse({
      status: "DELIVERED",
      otp: "123456",
      signaturePlaceholder: "Signed on glass",
      photoPlaceholder: "pod-photo.jpg",
      gpsLatitude: -1.2921,
      gpsLongitude: 36.8219,
      customerRemarks: "Received in good condition."
    }).success).toBe(true);
    expect(deliveryStatusSchema.safeParse({ status: "DELIVERED" }).success).toBe(false);
    expect(deliveryStatusSchema.safeParse({ status: "FAILED" }).success).toBe(false);
  });

  it("maps delivery workflow to order statuses", () => {
    expect(orderStatusForDelivery("ASSIGNED")).toBe("ASSIGNED");
    expect(orderStatusForDelivery("LOADING_CONFIRMED")).toBe("DISPATCHED");
    expect(orderStatusForDelivery("CUSTOMER_ARRIVAL")).toBe("DISPATCHED");
    expect(orderStatusForDelivery("FAILED")).toBe("DISPATCHED");
    expect(orderStatusForDelivery("RETURNED")).toBe("DISPATCHED");
    expect(orderStatusForDelivery("DELIVERED")).toBe("DELIVERED");
    expect(nextDeliveryStatuses("ASSIGNED")).toEqual(["LOADING_CONFIRMED", "EXCEPTION"]);
  });

  it("applies delivery role permissions", () => {
    expect(canManageDeliveries("ADMIN")).toBe(true);
    expect(canManageDeliveries("WAREHOUSE_MANAGER")).toBe(true);
    expect(canUpdateDeliveryStatus("MSO")).toBe(true);
    expect(canViewDeliveries("AUDITOR")).toBe(true);
    expect(canManageDeliveries("AUDITOR")).toBe(false);
    expect(canViewDeliveries("CUSTOMER")).toBe(false);
  });
});
