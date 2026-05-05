import { describe, expect, it } from "vitest";
import { canAccessPath, defaultRouteByRole } from "@/lib/rbac";

describe("role-based access control", () => {
  it("lets admin access every protected page", () => {
    expect(canAccessPath("ADMIN", "/settings")).toBe(true);
    expect(canAccessPath("ADMIN", "/audit-logs")).toBe(true);
  });

  it("limits warehouse manager to warehouse inventory and transfers", () => {
    expect(canAccessPath("WAREHOUSE_MANAGER", "/inventory")).toBe(true);
    expect(canAccessPath("WAREHOUSE_MANAGER", "/transfers")).toBe(true);
    expect(canAccessPath("WAREHOUSE_MANAGER", "/reports")).toBe(false);
  });

  it("limits auditor to reports and audit logs", () => {
    expect(canAccessPath("AUDITOR", "/reports")).toBe(true);
    expect(canAccessPath("AUDITOR", "/audit-logs")).toBe(true);
    expect(canAccessPath("AUDITOR", "/customers")).toBe(true);
    expect(canAccessPath("AUDITOR", "/inventory")).toBe(false);
  });

  it("has a default dashboard for each role", () => {
    expect(defaultRouteByRole.RSO).toBe("/rso");
    expect(defaultRouteByRole.CUSTOMER).toBe("/customer");
  });
});
