import type { AppRole } from "@/lib/auth-types";

export const customerCustodyFilters = [
  "ALL",
  "OVERDUE_CYLINDERS",
  "INACTIVE_WITH_CYLINDERS",
  "HIGH_FREQUENCY",
  "DUE_REFILL_FOLLOW_UP"
] as const;

export type CustomerCustodyFilter = (typeof customerCustodyFilters)[number];

export function canViewCustomerKyc(role: AppRole) {
  return ["ADMIN", "RSO", "MSO", "SERVICE_CENTRE_STAFF", "FINANCE_SAP_REVIEWER", "AUDITOR"].includes(role);
}

export function canCreateRefillFollowUpReminders(role: AppRole) {
  return ["ADMIN", "RSO", "MSO", "SERVICE_CENTRE_STAFF"].includes(role);
}

export function normalizeCustomerCustodyFilter(value?: string | null): CustomerCustodyFilter {
  return customerCustodyFilters.includes(value as CustomerCustodyFilter) ? value as CustomerCustodyFilter : "ALL";
}

export function followUpDaysForCylinderSize(sizeKg?: number | null) {
  if (sizeKg === 6) return 21;
  if (sizeKg === 13) return 30;
  if (sizeKg === 50) return 45;
  return 30;
}

export function expectedRefillFollowUpDate(lastActivityDate: Date, sizeKg?: number | null) {
  const date = new Date(lastActivityDate);
  date.setDate(date.getDate() + followUpDaysForCylinderSize(sizeKg));
  return date;
}

export function isDueForRefillFollowUp(input: { returnDate?: Date | null; expectedReturnFollowUpDate?: Date | null }, now = new Date(), lookAheadDays = 7) {
  if (input.returnDate || !input.expectedReturnFollowUpDate) return false;
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + lookAheadDays);
  return input.expectedReturnFollowUpDate >= startOfDay(now) && input.expectedReturnFollowUpDate <= endOfDay(windowEnd);
}

export function isOverdueCustody(input: { returnDate?: Date | null; expectedReturnFollowUpDate?: Date | null }, now = new Date()) {
  return !input.returnDate && Boolean(input.expectedReturnFollowUpDate && input.expectedReturnFollowUpDate < startOfDay(now));
}

export function customerFrequencyLabel(transactionCount90Days: number) {
  if (transactionCount90Days >= 6) return "Very high";
  if (transactionCount90Days >= 3) return "High";
  if (transactionCount90Days >= 1) return "Active";
  return "Low";
}

export function formatCustomerCustodyFilter(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}
