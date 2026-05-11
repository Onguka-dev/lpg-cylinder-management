import { z } from "zod";
import { CylinderMaintenanceStatus } from "@prisma/client";
import type { AppRole } from "@/lib/auth-types";
import { isCylinderBlockedForSaleOrDispatch } from "@/lib/inventory";

export const inspectionResults = ["PASSED", "FAILED", "NEEDS_HYDRO_TEST", "UNSAFE"] as const;
export const maintenanceCaseStatuses = ["OPEN", "INSPECTION_RECORDED", "QUARANTINED", "APPROVED_RETURN_TO_STOCK", "SCRAP_PLACEHOLDER", "CLOSED"] as const;
export const incidentSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const maintenanceCaseSchema = z.object({
  cylinderId: z.string().min(1, "Select a cylinder."),
  reason: z.string().trim().min(5, "Maintenance reason must be at least 5 characters.").max(500, "Maintenance reason must be 500 characters or fewer."),
  certificateUploadPlaceholder: z.string().trim().max(200, "Certificate placeholder must be 200 characters or fewer.").optional().nullable(),
  documentUploadPlaceholder: z.string().trim().max(200, "Document placeholder must be 200 characters or fewer.").optional().nullable()
});

export const inspectionSchema = z.object({
  inspectionResult: z.enum(inspectionResults),
  inspectionNotes: z.string().trim().min(3, "Inspection notes must be at least 3 characters.").max(500, "Inspection notes must be 500 characters or fewer.")
});

export const safetyIncidentSchema = z.object({
  cylinderId: z.string().optional().nullable(),
  title: z.string().trim().min(3, "Incident title must be at least 3 characters.").max(120, "Incident title must be 120 characters or fewer."),
  severity: z.enum(incidentSeverities),
  incidentDate: z.string().min(1, "Select an incident date."),
  locationId: z.string().optional().nullable(),
  description: z.string().trim().min(5, "Incident description must be at least 5 characters.").max(800, "Incident description must be 800 characters or fewer."),
  correctiveAction: z.string().trim().max(500, "Corrective action must be 500 characters or fewer.").optional().nullable(),
  certificateUploadPlaceholder: z.string().trim().max(200, "Certificate placeholder must be 200 characters or fewer.").optional().nullable(),
  photoUploadPlaceholder: z.string().trim().max(200, "Photo placeholder must be 200 characters or fewer.").optional().nullable()
});

export function canManageSafety(role: AppRole) {
  return role === "ADMIN" || role === "WAREHOUSE_MANAGER" || role === "PLANT_MANAGER";
}

export function canViewSafety(role: AppRole) {
  return canManageSafety(role) || role === "AUDITOR";
}

export function canApproveSafety(role: AppRole) {
  return role === "ADMIN" || role === "WAREHOUSE_MANAGER" || role === "PLANT_MANAGER";
}

export function generateSafetyReference(prefix: string) {
  const now = new Date();
  return `${prefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}${String(now.getMilliseconds()).padStart(3, "0")}`;
}

export function formatSafetyLabel(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export type SaleEligibleCylinder = {
  status: string;
  activeStatus?: boolean | null;
  expiryDate?: Date | null;
  hydroTestDueDate?: Date | null;
  unsafeStatus?: boolean;
  quarantinedStatus?: boolean;
  maintenanceStatus?: string;
};

export function cylinderSaleBlockedReason(cylinder: SaleEligibleCylinder, now = new Date()) {
  if (cylinder.activeStatus === false) return "Cylinder is inactive and cannot be sold or dispatched.";
  if (cylinder.status === "DAMAGED") return "Cylinder is damaged and cannot be sold or dispatched.";
  if (cylinder.status === "QUARANTINED") return "Cylinder is quarantined and cannot be sold or dispatched.";
  if (cylinder.status === "SCRAPPED_WRITTEN_OFF") return "Cylinder is scrapped or written off and cannot be sold or dispatched.";
  if (cylinder.status === "LOST_OVERDUE") return "Cylinder is lost or overdue and cannot be sold or dispatched.";
  if (cylinder.status === "UNDER_MAINTENANCE" || cylinder.maintenanceStatus === "OPEN" || cylinder.maintenanceStatus === "IN_PROGRESS") {
    return "Cylinder is under maintenance and cannot be sold or dispatched.";
  }
  if (cylinder.unsafeStatus) return "Cylinder is marked unsafe and cannot be sold or dispatched.";
  if (cylinder.quarantinedStatus) return "Cylinder is quarantined and cannot be sold or dispatched.";
  if (cylinder.expiryDate && cylinder.expiryDate < now) return "Cylinder is expired and cannot be sold or dispatched.";
  if (cylinder.hydroTestDueDate && cylinder.hydroTestDueDate < now) return "Cylinder hydro-test is overdue and cannot be sold or dispatched.";
  return null;
}

export function saleEligibleCylinderWhere(now = new Date()) {
  return {
    status: "FILLED" as const,
    activeStatus: true,
    unsafeStatus: false,
    quarantinedStatus: false,
    maintenanceStatus: { in: [CylinderMaintenanceStatus.NONE, CylinderMaintenanceStatus.CLEARED] },
    OR: [{ expiryDate: null }, { expiryDate: { gte: now } }],
    AND: [{ OR: [{ hydroTestDueDate: null }, { hydroTestDueDate: { gte: now } }] }]
  };
}

export function assertCylinderSaleOrDispatchAllowed(cylinder: SaleEligibleCylinder) {
  const reason = cylinderSaleBlockedReason(cylinder);
  if (reason || isCylinderBlockedForSaleOrDispatch(cylinder)) {
    throw new Error(reason ?? "Cylinder cannot be sold or dispatched.");
  }
}
