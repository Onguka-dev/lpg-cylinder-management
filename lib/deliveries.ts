import { z } from "zod";
import type { AppRole } from "@/lib/auth-types";

export const deliveryStatuses = ["ASSIGNED", "LOADING_CONFIRMED", "CUSTOMER_ARRIVAL", "DELIVERED", "FAILED", "RETURNED", "EXCEPTION"] as const;
export const failedDeliveryReasons = ["CUSTOMER_UNAVAILABLE", "DAMAGED_CYLINDER", "WRONG_LOCATION", "PAYMENT_ISSUE", "PARTIAL_DELIVERY"] as const;

export const deliveryAssignmentSchema = z.object({
  orderId: z.string().min(1, "Select an order for delivery assignment."),
  routeId: z.string().optional().nullable(),
  zoneId: z.string().optional().nullable(),
  vehicleId: z.string().optional().nullable(),
  assignedUserId: z.string().optional().nullable(),
  driverName: z.string().trim().min(2, "Driver name must be at least 2 characters.").max(100, "Driver name must be 100 characters or fewer.").optional().nullable()
});

export const deliveryStatusSchema = z.object({
  status: z.enum(deliveryStatuses),
  failedReason: z.enum(failedDeliveryReasons).optional().nullable(),
  otp: z.string().trim().regex(/^[0-9]{4,8}$/, "OTP must be 4 to 8 digits.").optional().nullable(),
  signaturePlaceholder: z.string().trim().max(120, "Signature placeholder must be 120 characters or fewer.").optional().nullable(),
  photoPlaceholder: z.string().trim().max(120, "Photo placeholder must be 120 characters or fewer.").optional().nullable(),
  gpsLatitude: z.coerce.number().min(-90, "GPS latitude must be at least -90.").max(90, "GPS latitude cannot exceed 90.").optional().nullable(),
  gpsLongitude: z.coerce.number().min(-180, "GPS longitude must be at least -180.").max(180, "GPS longitude cannot exceed 180.").optional().nullable(),
  customerRemarks: z.string().trim().max(400, "Customer remarks must be 400 characters or fewer.").optional().nullable(),
  exceptionNotes: z.string().trim().max(500, "Exception notes must be 500 characters or fewer.").optional().nullable()
}).superRefine((value, context) => {
  if (["FAILED", "RETURNED", "EXCEPTION"].includes(value.status) && !value.failedReason) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["failedReason"],
      message: "Select a failed delivery reason."
    });
  }

  if (value.status === "DELIVERED" && !value.otp) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["otp"],
      message: "Enter the customer OTP before marking delivery as delivered."
    });
  }
});

export type DeliveryStatusKey = (typeof deliveryStatuses)[number];

export function canViewDeliveries(role: AppRole) {
  return ["ADMIN", "WAREHOUSE_MANAGER", "PLANT_MANAGER", "MSO", "AUDITOR"].includes(role);
}

export function canManageDeliveries(role: AppRole) {
  return ["ADMIN", "WAREHOUSE_MANAGER", "PLANT_MANAGER", "MSO"].includes(role);
}

export function canUpdateDeliveryStatus(role: AppRole) {
  return ["ADMIN", "WAREHOUSE_MANAGER", "PLANT_MANAGER", "MSO"].includes(role);
}

export function formatDeliveryStatus(status: string) {
  return titleize(status);
}

export function formatFailedDeliveryReason(reason: string) {
  return titleize(reason);
}

export function generateDeliveryNumber() {
  const now = new Date();
  return `DLV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}${String(now.getMilliseconds()).padStart(3, "0")}`;
}

export function orderStatusForDelivery(status: DeliveryStatusKey) {
  if (status === "ASSIGNED") return "ASSIGNED";
  if (status === "DELIVERED") return "DELIVERED";
  return "DISPATCHED";
}

export function nextDeliveryStatuses(status: DeliveryStatusKey) {
  const map: Record<DeliveryStatusKey, DeliveryStatusKey[]> = {
    ASSIGNED: ["LOADING_CONFIRMED", "EXCEPTION"],
    LOADING_CONFIRMED: ["CUSTOMER_ARRIVAL", "FAILED", "RETURNED", "EXCEPTION"],
    CUSTOMER_ARRIVAL: ["DELIVERED", "FAILED", "RETURNED", "EXCEPTION"],
    DELIVERED: [],
    FAILED: [],
    RETURNED: [],
    EXCEPTION: []
  };

  return map[status];
}

function titleize(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
