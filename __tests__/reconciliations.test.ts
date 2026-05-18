import { describe, expect, it } from "vitest";
import {
  canAdminOverrideReconciliation,
  canCreateReconciliations,
  canReviewReconciliations,
  canViewReconciliations,
  actualClosingFromCountLines,
  dayRange,
  formatReconciliationLabel,
  reconciliationCountModes,
  reconciliationCountStatuses,
  reconciliationCreateSchema,
  reconciliationLocked,
  reconciliationOverrideSchema,
  reconciliationReviewSchema,
  reconciliationScopes,
  reconciliationStatuses,
  reconciliationVarianceStatuses,
  reconciliationVarianceTypes
} from "@/lib/reconciliations";

describe("daily reconciliation controls", () => {
  it("supports the Stage 11 scopes and review states", () => {
    expect(reconciliationScopes).toEqual(["RSO", "MSO", "WAREHOUSE", "SERVICE_CENTRE"]);
    expect(reconciliationStatuses).toEqual(["DRAFT", "SUBMITTED", "APPROVED", "RETURNED", "CLOSED"]);
    expect(reconciliationCountModes).toEqual(["SUMMARY", "SCAN"]);
    expect(reconciliationCountStatuses).toContain("FILLED_AT_SELLING_POINT");
    expect(reconciliationVarianceTypes).toContain("OVERDUE_IN_TRANSIT");
    expect(reconciliationVarianceStatuses).toContain("RESOLVED");
  });

  it("validates close-of-day input clearly", () => {
    expect(reconciliationCreateSchema.safeParse({
      reconciliationDate: "2026-05-06",
      scope: "SERVICE_CENTRE",
      ownerId: "user-id",
      actualCash: 1250,
      countLines: [{ skuId: "sku-6kg", status: "FILLED_AT_SELLING_POINT", actualCount: 7, scannedCount: 7, countMode: "SCAN" }]
    }).success).toBe(true);
    expect(reconciliationCreateSchema.safeParse({
      reconciliationDate: "2026-05-06",
      scope: "RSO",
      ownerId: "user-id",
      actualClosingStock: -1,
      actualCash: 1250
    }).success).toBe(false);
  });

  it("validates supervisor review and admin override", () => {
    expect(reconciliationReviewSchema.safeParse({ status: "APPROVED", supervisorNotes: "Balanced" }).success).toBe(true);
    expect(reconciliationReviewSchema.safeParse({ status: "CLOSED", supervisorNotes: "All variances closed" }).success).toBe(true);
    expect(reconciliationReviewSchema.safeParse({ status: "DRAFT" }).success).toBe(false);
    expect(reconciliationOverrideSchema.safeParse({
      actualClosingStock: 9,
      actualCash: 1200,
      adminOverrideReason: "Count corrected after supervisor recount."
    }).success).toBe(true);
    expect(reconciliationOverrideSchema.safeParse({ actualClosingStock: 9, actualCash: 1200, adminOverrideReason: "No" }).success).toBe(false);
  });

  it("applies reconciliation permissions", () => {
    expect(canViewReconciliations("AUDITOR")).toBe(true);
    expect(canCreateReconciliations("RSO")).toBe(true);
    expect(canCreateReconciliations("AUDITOR")).toBe(false);
    expect(canReviewReconciliations("WAREHOUSE_MANAGER")).toBe(true);
    expect(canReviewReconciliations("MSO")).toBe(false);
    expect(canReviewReconciliations("AUDITOR")).toBe(false);
    expect(canAdminOverrideReconciliation("ADMIN")).toBe(true);
    expect(canAdminOverrideReconciliation("WAREHOUSE_MANAGER")).toBe(false);
  });

  it("normalizes date ranges and locks approved records", () => {
    const range = dayRange("2026-05-06T15:30:00.000Z");
    expect(range.start.getHours()).toBe(0);
    expect(range.end.getTime() - range.start.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(reconciliationLocked("APPROVED")).toBe(true);
    expect(reconciliationLocked("CLOSED")).toBe(true);
    expect(reconciliationLocked("SUBMITTED")).toBe(false);
  });

  it("uses physical count lines as the closing stock source when present", () => {
    expect(actualClosingFromCountLines(99, [{ actualCount: 3 }, { actualCount: 4 }])).toBe(7);
    expect(actualClosingFromCountLines(8, [])).toBe(8);
  });

  it("formats reconciliation labels", () => {
    expect(formatReconciliationLabel("WAREHOUSE")).toBe("Warehouse");
    expect(formatReconciliationLabel("UNDER_REVIEW")).toBe("Under Review");
  });
});
