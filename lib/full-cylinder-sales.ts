import { z } from "zod";
import type { AppRole } from "@/lib/auth-types";
import { customerSchema } from "@/lib/customers";
import { paymentMethods } from "@/lib/refill-sales";

export const fullCylinderSaleSchema = z.object({
  customerId: z.string().optional().nullable(),
  customer: customerSchema.optional(),
  locationId: z.string().optional().nullable(),
  cylinderCode: z.string().trim().min(1, "Scan the full cylinder barcode or serial number."),
  paymentMethod: z.enum(paymentMethods),
  paymentReference: z.string().trim().max(80).optional().nullable(),
  cylinderAmount: z.coerce.number().nonnegative().optional().default(0),
  gasAmount: z.coerce.number().nonnegative().optional().default(0),
  notes: z.string().trim().max(500).optional().nullable()
}).superRefine((value, context) => {
  if (!value.customerId && !value.customer) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customerId"],
      message: "Select an existing customer or register a new customer."
    });
  }
});

export type FullCylinderSaleInput = z.infer<typeof fullCylinderSaleSchema>;

export function canManageFullCylinderSales(role: AppRole) {
  return role === "ADMIN" || role === "RSO" || role === "MSO" || role === "SERVICE_CENTRE_STAFF";
}

export function canViewFullCylinderSales(role: AppRole) {
  return canManageFullCylinderSales(role) || role === "AUDITOR";
}

export function generateFullCylinderSaleReference(prefix: string) {
  const now = new Date();
  return `${prefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}${String(now.getMilliseconds()).padStart(3, "0")}`;
}
