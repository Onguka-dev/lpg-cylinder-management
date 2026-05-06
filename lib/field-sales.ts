import { z } from "zod";
import type { AppRole } from "@/lib/auth-types";
import { customerSchema } from "@/lib/customers";
import { paymentMethods } from "@/lib/refill-sales";

export const fieldDeliveryStatuses = ["DELIVERED", "PARTIAL", "FAILED", "RESCHEDULED"] as const;

export const fieldSaleSchema = z.object({
  customerId: z.string().optional().nullable(),
  customer: customerSchema.optional(),
  skuId: z.string().min(1, "Select a SKU or cylinder size."),
  paymentMethod: z.enum(paymentMethods),
  paymentReference: z.string().trim().max(80, "Payment reference must be 80 characters or fewer.").optional().nullable(),
  deliveryStatus: z.enum(fieldDeliveryStatuses),
  discrepancyReport: z.string().trim().max(500, "Discrepancy report must be 500 characters or fewer.").optional().nullable(),
  offlineSyncPlaceholder: z.string().trim().max(160, "Offline sync note must be 160 characters or fewer.").optional().nullable()
}).superRefine((value, context) => {
  if (!value.customerId && !value.customer) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customerId"],
      message: "Select an existing customer or register a field customer."
    });
  }
});

export type FieldSaleFormValues = z.infer<typeof fieldSaleSchema>;

export function canManageFieldSales(role: AppRole) {
  return role === "ADMIN" || role === "MSO";
}

export function canViewFieldSales(role: AppRole) {
  return canManageFieldSales(role) || role === "AUDITOR";
}

export function generateFieldSaleNumber() {
  const now = new Date();
  return `FS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}${String(now.getMilliseconds()).padStart(3, "0")}`;
}

export function formatFieldDeliveryStatus(status: string) {
  return status.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
