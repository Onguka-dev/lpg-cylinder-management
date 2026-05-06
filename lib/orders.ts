import { z } from "zod";
import type { AppRole } from "@/lib/auth-types";

export const orderChannels = ["MOBILE_APP", "WEB", "RSO", "MSO", "CALL_CENTRE"] as const;
export const orderStatuses = ["PENDING", "CONFIRMED", "ASSIGNED", "DISPATCHED", "DELIVERED", "CLOSED", "CANCELLED"] as const;

export const orderItemSchema = z.object({
  skuId: z.string().min(1, "Select a SKU for every order line."),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1.").max(500, "Quantity must be 500 or fewer."),
  notes: z.string().trim().max(240, "Line notes must be 240 characters or fewer.").optional().nullable()
});

export const orderSchema = z.object({
  customerId: z.string().min(1, "Select a customer."),
  channel: z.enum(orderChannels),
  isPriority: z.coerce.boolean().optional(),
  deliveryZoneId: z.string().optional().nullable(),
  expectedDeliveryDate: z.string().optional().nullable(),
  notes: z.string().trim().max(500, "Notes must be 500 characters or fewer.").optional().nullable(),
  items: z.array(orderItemSchema).min(1, "Add at least one order item.").max(10, "Use 10 or fewer order lines.")
});

export const orderStatusActionSchema = z.object({
  status: z.enum(orderStatuses),
  notes: z.string().trim().max(300, "Status notes must be 300 characters or fewer.").optional().nullable()
});

export type OrderFormValues = z.infer<typeof orderSchema>;
export type OrderStatusKey = (typeof orderStatuses)[number];

export function canViewOrders(role: AppRole) {
  return ["ADMIN", "WAREHOUSE_MANAGER", "RSO", "MSO", "AUDITOR"].includes(role);
}

export function canManageOrders(role: AppRole) {
  return ["ADMIN", "RSO", "MSO"].includes(role);
}

export function canChangeOrderStatus(role: AppRole) {
  return ["ADMIN", "WAREHOUSE_MANAGER", "RSO", "MSO"].includes(role);
}

export function canModifyOrderStatus(status: string) {
  return !["DISPATCHED", "DELIVERED", "CLOSED", "CANCELLED"].includes(status);
}

export function formatOrderChannel(channel: string) {
  return titleize(channel);
}

export function formatOrderStatus(status: string) {
  return titleize(status);
}

export function generateOrderNumber() {
  const now = new Date();
  return `ORD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}${String(now.getMilliseconds()).padStart(3, "0")}`;
}

export function nextStatuses(status: OrderStatusKey) {
  const map: Record<OrderStatusKey, OrderStatusKey[]> = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["ASSIGNED", "CANCELLED"],
    ASSIGNED: ["DISPATCHED", "CANCELLED"],
    DISPATCHED: ["DELIVERED"],
    DELIVERED: ["CLOSED"],
    CLOSED: [],
    CANCELLED: []
  };

  return map[status];
}

function titleize(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
