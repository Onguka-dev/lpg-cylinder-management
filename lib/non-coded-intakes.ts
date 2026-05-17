import { z } from "zod";
import type { AppRole } from "@/lib/auth-types";

export const nonCodedCylinderConditions = [
  "GOOD",
  "DAMAGED",
  "LEAKING",
  "MISSING_VALVE",
  "WRONG_BRAND",
  "UNCLEAR_SERIAL",
  "NON_CODED"
] as const;

export const nonCodedCylinderIntakeStatuses = [
  "PENDING_REVIEW",
  "TAGGING_PENDING",
  "TAGGED_APPROVED",
  "APPROVED_LINKED",
  "APPROVED_NEW_CYLINDER",
  "REJECTED",
  "ESCALATED"
] as const;

export const nonCodedReviewActions = [
  "LINK_EXISTING",
  "CREATE_PENDING_CYLINDER",
  "TAG_AND_APPROVE",
  "REJECT",
  "ESCALATE"
] as const;

export const nonCodedCylinderIntakeSchema = z.object({
  customerId: z.string().trim().optional().nullable(),
  customerQuery: z.string().trim().optional().nullable(),
  visibleSerialNumber: z.string().trim().min(2, "Enter the visible serial number or marking."),
  cylinderSizeKg: z.coerce.number().int().refine((value) => [6, 13, 50].includes(value), "Select a valid cylinder size."),
  manufacturer: z.string().trim().max(80, "Brand/manufacturer must be 80 characters or fewer.").optional().nullable(),
  condition: z.enum(nonCodedCylinderConditions),
  photoPlaceholder: z.string().trim().max(160, "Photo placeholder must be 160 characters or fewer.").optional().nullable(),
  intakeLocationId: z.string().trim().optional().nullable(),
  staffRemarks: z.string().trim().max(500, "Staff remarks must be 500 characters or fewer.").optional().nullable()
}).superRefine((value, context) => {
  if (!value.customerId && !value.customerQuery) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customerQuery"],
      message: "Search or select the customer before registering a non-coded return."
    });
  }
});

export const nonCodedIntakeReviewSchema = z.object({
  action: z.enum(nonCodedReviewActions),
  cylinderCode: z.string().trim().optional().nullable(),
  newBarcode: z.string().trim().optional().nullable(),
  newQrCode: z.string().trim().optional().nullable(),
  reviewNotes: z.string().trim().max(500, "Review notes must be 500 characters or fewer.").optional().nullable()
}).superRefine((value, context) => {
  if (value.action === "LINK_EXISTING" && !value.cylinderCode) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["cylinderCode"], message: "Scan or enter the existing cylinder to link." });
  }
  if (value.action === "TAG_AND_APPROVE" && !value.newBarcode && !value.newQrCode) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["newBarcode"], message: "Enter a barcode or QR code before approving into normal inventory." });
  }
});

export type NonCodedCylinderIntakeInput = z.infer<typeof nonCodedCylinderIntakeSchema>;
export type NonCodedIntakeReviewInput = z.infer<typeof nonCodedIntakeReviewSchema>;

export function canCreateNonCodedCylinderIntake(role: AppRole) {
  return ["ADMIN", "RSO", "MSO", "SERVICE_CENTRE_STAFF"].includes(role);
}

export function canReviewNonCodedCylinderIntake(role: AppRole) {
  return role === "ADMIN" || role === "WAREHOUSE_MANAGER";
}

export function canViewNonCodedCylinderIntake(role: AppRole) {
  return canCreateNonCodedCylinderIntake(role) || canReviewNonCodedCylinderIntake(role) || role === "AUDITOR";
}

export function formatNonCodedLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function isNonCodedIntakeBlockedForSale(status: string) {
  return status !== "TAGGED_APPROVED" && status !== "APPROVED_LINKED" && status !== "APPROVED_NEW_CYLINDER";
}

export function isDamagedNonCodedCondition(condition: string) {
  return ["DAMAGED", "LEAKING", "MISSING_VALVE"].includes(condition);
}
