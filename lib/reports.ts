import { z } from "zod";
import type { AppRole } from "@/lib/auth-types";

export const reportTypes = [
  "movement-report",
  "stock-report",
  "customer-custody-report",
  "nairobi-service-centre-stock",
  "inventory-levels",
  "cylinder-status",
  "cylinder-location",
  "cylinder-circulation",
  "sales-revenue",
  "outstanding-payments",
  "customer-credit-limits",
  "delivery-performance",
  "reconciliation-variances",
  "safety-compliance",
  "maintenance-due",
  "damaged-cylinders",
  "user-activity"
] as const;

export const reportFilterSchema = z.object({
  dateFrom: z.string().optional().nullable(),
  dateTo: z.string().optional().nullable(),
  regionId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  customerCategory: z.string().optional().nullable(),
  skuId: z.string().optional().nullable(),
  status: z.string().optional().nullable()
});

export type ReportFilters = z.infer<typeof reportFilterSchema>;
export type ReportType = (typeof reportTypes)[number];

export function canViewReports(role: AppRole) {
  return ["ADMIN", "WAREHOUSE_MANAGER", "PLANT_MANAGER", "RSO", "MSO", "SERVICE_CENTRE_STAFF", "FINANCE_SAP_REVIEWER", "AUDITOR"].includes(role);
}

export function normalizeReportFilters(input: Record<string, unknown>): ReportFilters {
  const parsed = reportFilterSchema.parse(input);
  return Object.fromEntries(
    Object.entries(parsed).map(([key, value]) => [key, typeof value === "string" && value.trim() === "" ? null : value])
  ) as ReportFilters;
}

export function dateRange(filters: ReportFilters) {
  const from = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
  const to = filters.dateTo ? new Date(filters.dateTo) : undefined;
  if (to) to.setHours(23, 59, 59, 999);
  return from || to ? { gte: from, lte: to } : undefined;
}

export function formatReportLabel(value: string) {
  return value
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "message\nNo records found\n";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}
