import { describe, expect, it } from "vitest";
import {
  canViewReports,
  dateRange,
  formatReportLabel,
  normalizeReportFilters,
  reportTypes,
  toCsv
} from "@/lib/reports";

describe("reporting and analytics", () => {
  it("includes required Stage 13 report types", () => {
    expect(reportTypes).toContain("inventory-levels");
    expect(reportTypes).toContain("sales-revenue");
    expect(reportTypes).toContain("reconciliation-variances");
    expect(reportTypes).toContain("safety-compliance");
    expect(reportTypes).toContain("user-activity");
  });

  it("normalizes filters and date range", () => {
    const filters = normalizeReportFilters({ dateFrom: "2026-05-01", dateTo: "2026-05-07", skuId: "" });
    const range = dateRange(filters);
    expect(filters.skuId).toBeNull();
    expect(range?.gte?.toISOString().slice(0, 10)).toBe("2026-05-01");
    expect(range?.lte?.getHours()).toBe(23);
  });

  it("exports CSV with escaping", () => {
    const csv = toCsv([{ name: "Nairobi, Main", status: "FILLED" }]);
    expect(csv).toContain("name,status");
    expect(csv).toContain("\"Nairobi, Main\",FILLED");
  });

  it("applies report permissions", () => {
    expect(canViewReports("ADMIN")).toBe(true);
    expect(canViewReports("AUDITOR")).toBe(true);
    expect(canViewReports("RSO")).toBe(true);
    expect(canViewReports("FINANCE_SAP_REVIEWER")).toBe(true);
    expect(canViewReports("CUSTOMER")).toBe(false);
  });

  it("formats report labels", () => {
    expect(formatReportLabel("reconciliation-variances")).toBe("Reconciliation Variances");
    expect(formatReportLabel("WAREHOUSE_MANAGER")).toBe("Warehouse Manager");
  });
});
