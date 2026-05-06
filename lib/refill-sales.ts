import { z } from "zod";
import type { AppRole } from "@/lib/auth-types";
import { customerSchema } from "@/lib/customers";

export const paymentMethods = ["CASH", "MPESA", "CARD"] as const;

export const refillOrderSchema = z.object({
  customerId: z.string().optional().nullable(),
  customer: customerSchema.optional(),
  skuId: z.string().min(1, "Select a SKU or cylinder size."),
  paymentMethod: z.enum(paymentMethods),
  paymentReference: z.string().trim().max(80, "Payment reference must be 80 characters or fewer.").optional().nullable(),
  notes: z.string().trim().max(400, "Notes must be 400 characters or fewer.").optional().nullable()
}).superRefine((value, context) => {
  if (!value.customerId && !value.customer) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customerId"],
      message: "Select an existing customer or register a new customer."
    });
  }
});

export type RefillOrderFormValues = z.infer<typeof refillOrderSchema>;

export function canManageRefillSales(role: AppRole) {
  return role === "ADMIN" || role === "RSO";
}

export function canViewRefillSales(role: AppRole) {
  return canManageRefillSales(role) || role === "AUDITOR";
}

export function formatPaymentMethod(method: string) {
  return method
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function generateRetailReference(prefix: string) {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
    String(now.getMilliseconds()).padStart(3, "0")
  ].join("");

  return `${prefix}-${stamp}`;
}
