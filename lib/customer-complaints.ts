import { z } from "zod";
import type { AppRole } from "@/lib/auth-types";

export const complaintTypes = [
  "GAS_LEAK",
  "DELIVERY_DELAY",
  "DAMAGED_CYLINDER",
  "PAYMENT_QUERY",
  "SERVICE_QUALITY",
  "OTHER"
] as const;

export const complaintPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const customerComplaintSchema = z.object({
  customerId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  type: z.enum(complaintTypes),
  priority: z.enum(complaintPriorities),
  description: z.string().trim().min(8, "Describe the complaint or escalation in at least 8 characters.").max(600),
  attachmentPlaceholder: z.string().trim().max(160, "Attachment note must be 160 characters or fewer.").optional().nullable(),
  escalationNotes: z.string().trim().max(400, "Escalation notes must be 400 characters or fewer.").optional().nullable()
});

export type CustomerComplaintFormValues = z.infer<typeof customerComplaintSchema>;

export function canManageCustomerComplaints(role: AppRole) {
  return role === "ADMIN" || role === "RSO" || role === "MSO" || role === "SERVICE_CENTRE_STAFF";
}

export function canViewCustomerComplaints(role: AppRole) {
  return canManageCustomerComplaints(role) || role === "AUDITOR" || role === "FINANCE_SAP_REVIEWER";
}

export function normalizeCustomerComplaintInput(input: CustomerComplaintFormValues) {
  return {
    customerId: input.customerId || null,
    locationId: input.locationId || null,
    type: input.type,
    priority: input.priority,
    description: input.description.trim(),
    attachmentPlaceholder: input.attachmentPlaceholder?.trim() || null,
    escalationNotes: input.escalationNotes?.trim() || null
  };
}

export function formatComplaintValue(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function generateComplaintNumber() {
  const now = new Date();
  return `CMP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}${String(now.getMilliseconds()).padStart(3, "0")}`;
}
