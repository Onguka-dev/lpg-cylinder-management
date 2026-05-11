import { z } from "zod";
import { Prisma } from "@prisma/client";
import type { AppRole } from "@/lib/auth-types";
import { DEFAULT_CURRENCY, DEFAULT_CURRENCY_LOCALE } from "@/lib/currency";

export const invoiceSourceTypes = ["CUSTOMER_ORDER", "RETAIL_REFILL"] as const;
export const invoiceStatuses = ["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"] as const;
export const billingPaymentMethods = ["CASH", "MPESA", "CARD", "ONLINE"] as const;

export const invoiceCreateSchema = z.object({
  sourceType: z.enum(invoiceSourceTypes),
  customerOrderId: z.string().optional().nullable(),
  refillOrderId: z.string().optional().nullable(),
  deliveryFeeAmount: z.coerce.number().nonnegative("Delivery fee cannot be negative.").optional().nullable(),
  discountAmount: z.coerce.number().nonnegative("Discount cannot be negative.").optional().nullable(),
  promotionPlaceholder: z.string().trim().max(160, "Promotion placeholder must be 160 characters or fewer.").optional().nullable(),
  notes: z.string().trim().max(400, "Notes must be 400 characters or fewer.").optional().nullable()
}).superRefine((value, context) => {
  if (value.sourceType === "CUSTOMER_ORDER" && !value.customerOrderId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["customerOrderId"], message: "Select a delivered order." });
  }
  if (value.sourceType === "RETAIL_REFILL" && !value.refillOrderId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["refillOrderId"], message: "Select a closed retail sale." });
  }
});

export const billingPaymentSchema = z.object({
  amount: z.coerce.number().positive("Payment amount must be greater than zero."),
  method: z.enum(billingPaymentMethods),
  reference: z.string().trim().max(100, "Payment reference must be 100 characters or fewer.").optional().nullable(),
  refundPlaceholder: z.string().trim().max(160, "Refund placeholder must be 160 characters or fewer.").optional().nullable()
});

export function canViewBilling(role: AppRole) {
  return ["ADMIN", "WAREHOUSE_MANAGER", "PLANT_MANAGER", "RSO", "MSO", "SERVICE_CENTRE_STAFF", "FINANCE_SAP_REVIEWER", "AUDITOR"].includes(role);
}

export function canManageBilling(role: AppRole) {
  return ["ADMIN", "WAREHOUSE_MANAGER", "RSO", "MSO", "SERVICE_CENTRE_STAFF", "FINANCE_SAP_REVIEWER"].includes(role);
}

export function formatMoney(value: unknown) {
  const numeric = value instanceof Prisma.Decimal ? value.toNumber() : Number(value ?? 0);
  return new Intl.NumberFormat(DEFAULT_CURRENCY_LOCALE, { style: "currency", currency: DEFAULT_CURRENCY, maximumFractionDigits: 2 }).format(numeric);
}

export function formatBillingLabel(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function generateInvoiceNumber() {
  return generateReference("INV");
}

export function generateReceiptNumber() {
  return generateReference("RCT");
}

export function invoiceStatusForAmounts(total: Prisma.Decimal, paid: Prisma.Decimal) {
  if (paid.greaterThanOrEqualTo(total)) return "PAID";
  if (paid.greaterThan(0)) return "PARTIALLY_PAID";
  return "ISSUED";
}

export function calculateTax(subtotal: Prisma.Decimal, vatRatePercent = 16) {
  return subtotal.mul(vatRatePercent).div(100).toDecimalPlaces(2);
}

function generateReference(prefix: string) {
  const now = new Date();
  return `${prefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}${String(now.getMilliseconds()).padStart(3, "0")}`;
}
