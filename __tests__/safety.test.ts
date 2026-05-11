import { describe, expect, it } from "vitest";
import {
  canManageSafety,
  canViewSafety,
  cylinderSaleBlockedReason,
  formatSafetyLabel,
  inspectionSchema,
  maintenanceCaseSchema,
  safetyIncidentSchema
} from "@/lib/safety";

describe("safety compliance", () => {
  it("validates maintenance cases, inspections, and incidents", () => {
    expect(maintenanceCaseSchema.safeParse({ cylinderId: "cyl", reason: "Valve leak found" }).success).toBe(true);
    expect(maintenanceCaseSchema.safeParse({ cylinderId: "", reason: "bad" }).success).toBe(false);
    expect(inspectionSchema.safeParse({ inspectionResult: "PASSED", inspectionNotes: "Looks safe" }).success).toBe(true);
    expect(inspectionSchema.safeParse({ inspectionResult: "UNKNOWN", inspectionNotes: "No" }).success).toBe(false);
    expect(safetyIncidentSchema.safeParse({ title: "Leak", severity: "HIGH", incidentDate: "2026-05-06", description: "Leak reported at outlet" }).success).toBe(true);
  });

  it("applies safety permissions", () => {
    expect(canManageSafety("ADMIN")).toBe(true);
    expect(canManageSafety("WAREHOUSE_MANAGER")).toBe(true);
    expect(canManageSafety("AUDITOR")).toBe(false);
    expect(canViewSafety("AUDITOR")).toBe(true);
    expect(canViewSafety("CUSTOMER")).toBe(false);
  });

  it("blocks unsafe cylinders from sale or dispatch", () => {
    expect(cylinderSaleBlockedReason({ status: "DAMAGED" })).toContain("damaged");
    expect(cylinderSaleBlockedReason({ status: "QUARANTINED" })).toContain("quarantined");
    expect(cylinderSaleBlockedReason({ status: "SCRAPPED_WRITTEN_OFF" })).toContain("scrapped");
    expect(cylinderSaleBlockedReason({ status: "LOST_OVERDUE" })).toContain("lost");
    expect(cylinderSaleBlockedReason({ status: "FILLED", unsafeStatus: true })).toContain("unsafe");
    expect(cylinderSaleBlockedReason({ status: "FILLED", quarantinedStatus: true })).toContain("quarantined");
    expect(cylinderSaleBlockedReason({ status: "FILLED", expiryDate: new Date("2020-01-01") }, new Date("2026-05-06"))).toContain("expired");
    expect(cylinderSaleBlockedReason({ status: "FILLED", hydroTestDueDate: new Date("2020-01-01") }, new Date("2026-05-06"))).toContain("hydro-test");
    expect(cylinderSaleBlockedReason({ status: "FILLED", maintenanceStatus: "NONE" }, new Date("2026-05-06"))).toBeNull();
  });

  it("formats compliance labels", () => {
    expect(formatSafetyLabel("NEEDS_HYDRO_TEST")).toBe("Needs Hydro Test");
  });
});
