import { describe, expect, it } from "vitest";
import {
  canManageNotifications,
  canSendNotifications,
  canViewNotifications,
  formatNotificationEvent,
  mockSendNotification,
  notificationCreateSchema,
  notificationEventTypes,
  renderNotificationTemplate,
  seedNotificationTemplates
} from "@/lib/notifications";

describe("notifications", () => {
  it("defines the Stage 14 event trigger set", () => {
    expect(notificationEventTypes).toEqual([
      "CUSTOMER_ORDER_CONFIRMATION",
      "DELIVERY_UPDATE",
      "RECEIPT_ISSUED",
      "LOW_STOCK_ALERT",
      "PENDING_DELIVERY_ALERT",
      "MAINTENANCE_ALERT",
      "EMERGENCY_RECALL",
      "SAFETY_WARNING"
    ]);
    expect(seedNotificationTemplates).toHaveLength(24);
  });

  it("validates clear notification input", () => {
    expect(notificationCreateSchema.safeParse({
      eventType: "DELIVERY_UPDATE",
      channel: "SMS",
      recipientContact: "+254700000001",
      message: "Delivery DLV-001 is now delivered."
    }).success).toBe(true);
    const invalid = notificationCreateSchema.safeParse({
      eventType: "DELIVERY_UPDATE",
      channel: "SMS",
      recipientContact: "",
      message: "Short"
    });
    expect(invalid.success).toBe(false);
  });

  it("renders template tokens for workflow payloads", () => {
    expect(renderNotificationTemplate("Order {{reference}} is {{status}}.", {
      reference: "ORD-001",
      status: "Confirmed"
    })).toBe("Order ORD-001 is Confirmed.");
  });

  it("keeps mock send deterministic", () => {
    expect(mockSendNotification({ recipientContact: "+254700000001", message: "Ready to send" }).status).toBe("SENT");
    expect(mockSendNotification({ recipientContact: "fail@example.com", message: "Ready to send" }).status).toBe("FAILED");
  });

  it("keeps notification permissions role-based", () => {
    expect(canViewNotifications("ADMIN")).toBe(true);
    expect(canViewNotifications("AUDITOR")).toBe(true);
    expect(canManageNotifications("WAREHOUSE_MANAGER")).toBe(false);
    expect(canSendNotifications("WAREHOUSE_MANAGER")).toBe(true);
    expect(canSendNotifications("AUDITOR")).toBe(false);
    expect(canViewNotifications("CUSTOMER")).toBe(false);
  });

  it("formats notification event labels", () => {
    expect(formatNotificationEvent("LOW_STOCK_ALERT")).toBe("Low Stock Alert");
  });
});
