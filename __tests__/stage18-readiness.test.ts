import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { billingPaymentSchema, calculateTax, invoiceCreateSchema, invoiceStatusForAmounts } from "@/lib/billing";
import { customerSchema, normalizeCustomerInput } from "@/lib/customers";
import { deliveryAssignmentSchema, deliveryStatusSchema, orderStatusForDelivery } from "@/lib/deliveries";
import { inventoryMovementSchema, movementActionSchema, normalizeInventoryMovementInput } from "@/lib/inventory-movements";
import { orderSchema, nextStatuses } from "@/lib/orders";
import { reconciliationCreateSchema, reconciliationReviewSchema, reconciliationLocked } from "@/lib/reconciliations";
import { refillOrderSchema } from "@/lib/refill-sales";
import { cylinderSaleBlockedReason, saleEligibleCylinderWhere } from "@/lib/safety";

describe("Stage 18 UAT demo readiness", () => {
  it("covers customer registration with normalized duplicate-check fields", () => {
    const parsed = customerSchema.safeParse({
      name: "UAT Domestic Customer",
      phone: "+254700888111",
      proofReference: " id-uat-001 ",
      category: "DOMESTIC",
      address: "Westlands, Nairobi",
      latitude: -1.267,
      longitude: 36.806,
      status: "ACTIVE",
      creditLimit: 15000,
      notes: "Stage 18 UAT customer."
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(normalizeCustomerInput(parsed.data).proofReference).toBe("ID-UAT-001");
    }
  });

  it("covers cylinder inventory movement request and approval validation", () => {
    const parsed = inventoryMovementSchema.safeParse({
      reference: "UAT-TRF-001",
      type: "TRANSFER",
      skuId: "sku-13kg",
      sourceLocationId: "warehouse-nairobi",
      destinationLocationId: "retail-westlands",
      sourceStatus: "FILLED",
      destinationStatus: "FILLED",
      requestedQuantity: 5,
      notes: "UAT transfer request."
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(normalizeInventoryMovementInput(parsed.data).reference).toBe("UAT-TRF-001");
    }
    expect(movementActionSchema.safeParse({ action: "approve", quantity: 5, notes: "Approved for UAT." }).success).toBe(true);
  });

  it("covers RSO retail refill sale readiness", () => {
    const parsed = refillOrderSchema.safeParse({
      customerId: "customer-uat",
      skuId: "sku-6kg",
      paymentMethod: "MPESA",
      paymentReference: "MPESA-UAT-001",
      notes: "Walk-in refill sale."
    });

    expect(parsed.success).toBe(true);
    expect(refillOrderSchema.safeParse({ skuId: "sku-6kg", paymentMethod: "CASH" }).success).toBe(false);
  });

  it("covers order lifecycle from creation through delivery-ready statuses", () => {
    const parsed = orderSchema.safeParse({
      customerId: "customer-uat",
      channel: "CALL_CENTRE",
      isPriority: true,
      deliveryZoneId: "zone-westlands",
      expectedDeliveryDate: "2026-05-15",
      items: [
        { skuId: "sku-13kg", quantity: 2 },
        { skuId: "sku-50kg", quantity: 1 }
      ]
    });

    expect(parsed.success).toBe(true);
    expect(nextStatuses("PENDING")).toEqual(["CONFIRMED", "CANCELLED"]);
    expect(nextStatuses("CONFIRMED")).toContain("ASSIGNED");
    expect(nextStatuses("ASSIGNED")).toContain("DISPATCHED");
  });

  it("covers delivery assignment and proof of delivery capture", () => {
    expect(deliveryAssignmentSchema.safeParse({
      orderId: "order-uat",
      routeId: "route-westlands",
      zoneId: "zone-westlands",
      vehicleId: "vehicle-uat",
      assignedUserId: "mso-user",
      driverName: "UAT Driver"
    }).success).toBe(true);

    expect(deliveryStatusSchema.safeParse({
      status: "DELIVERED",
      otp: "123456",
      signaturePlaceholder: "Signature captured placeholder",
      photoPlaceholder: "pod-uat.jpg",
      gpsLatitude: -1.2921,
      gpsLongitude: 36.8219,
      customerRemarks: "Received."
    }).success).toBe(true);
    expect(orderStatusForDelivery("DELIVERED")).toBe("DELIVERED");
  });

  it("covers invoice creation and partial payment status", () => {
    expect(invoiceCreateSchema.safeParse({
      sourceType: "CUSTOMER_ORDER",
      customerOrderId: "order-uat",
      deliveryFeeAmount: 250,
      discountAmount: 100,
      promotionPlaceholder: "UAT promo placeholder"
    }).success).toBe(true);
    expect(billingPaymentSchema.safeParse({ amount: 1000, method: "CARD", reference: "CARD-UAT-001" }).success).toBe(true);
    expect(calculateTax(new Prisma.Decimal(2000)).toString()).toBe("320");
    expect(invoiceStatusForAmounts(new Prisma.Decimal(2500), new Prisma.Decimal(1000))).toBe("PARTIALLY_PAID");
  });

  it("covers reconciliation submission and review readiness", () => {
    expect(reconciliationCreateSchema.safeParse({
      reconciliationDate: "2026-05-15",
      scope: "MSO",
      ownerId: "mso-user",
      actualClosingStock: 12,
      actualCash: 4500,
      stockExplanation: "Variance checked.",
      paymentExplanation: "Mpesa pending settlement placeholder."
    }).success).toBe(true);
    expect(reconciliationReviewSchema.safeParse({ status: "APPROVED", supervisorNotes: "Approved for UAT." }).success).toBe(true);
    expect(reconciliationLocked("APPROVED")).toBe(true);
  });

  it("covers compliance blocking for damaged or unsafe cylinders", () => {
    expect(cylinderSaleBlockedReason({ status: "DAMAGED" })).toContain("damaged");
    expect(cylinderSaleBlockedReason({ status: "FILLED", unsafeStatus: true })).toContain("unsafe");
    expect(cylinderSaleBlockedReason({ status: "FILLED", quarantinedStatus: true })).toContain("quarantined");
    expect(cylinderSaleBlockedReason({ status: "FILLED", maintenanceStatus: "IN_PROGRESS" })).toContain("maintenance");
    expect(saleEligibleCylinderWhere()).toMatchObject({
      status: "FILLED",
      unsafeStatus: false,
      quarantinedStatus: false
    });
  });
});
