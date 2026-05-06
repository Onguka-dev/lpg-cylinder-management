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
    expect(canAccessPath("AUDITOR", "/inventory")).toBe(true);
    expect(canAccessPath("AUDITOR", "/transfers")).toBe(false);
  });

  it("allows RSO and MSO to reach assigned inventory movement workflows", () => {
    expect(canAccessPath("RSO", "/inventory/movements")).toBe(true);
    expect(canAccessPath("RSO", "/inventory/cylinders")).toBe(false);
    expect(canAccessPath("MSO", "/api/inventory/movements")).toBe(true);
    expect(canAccessPath("MSO", "/inventory/stock-balances")).toBe(false);
  });

  it("allows RSO refill sales while blocking unrelated roles", () => {
    expect(canAccessPath("RSO", "/retail-sales/refills")).toBe(true);
    expect(canAccessPath("RSO", "/api/retail/refill-orders")).toBe(true);
    expect(canAccessPath("MSO", "/retail-sales/refills")).toBe(false);
    expect(canAccessPath("CUSTOMER", "/retail-sales/refills")).toBe(false);
    expect(canAccessPath("AUDITOR", "/retail-sales/refills")).toBe(true);
  });

  it("allows order management for operational roles", () => {
    expect(canAccessPath("RSO", "/orders")).toBe(true);
    expect(canAccessPath("MSO", "/api/orders")).toBe(true);
    expect(canAccessPath("WAREHOUSE_MANAGER", "/orders")).toBe(true);
    expect(canAccessPath("AUDITOR", "/orders")).toBe(true);
    expect(canAccessPath("CUSTOMER", "/orders")).toBe(false);
  });

  it("allows MSO field sales while keeping write APIs away from unrelated roles", () => {
    expect(canAccessPath("MSO", "/field-sales")).toBe(true);
    expect(canAccessPath("MSO", "/api/field-sales/sales")).toBe(true);
    expect(canAccessPath("AUDITOR", "/field-sales/sales")).toBe(true);
    expect(canAccessPath("AUDITOR", "/api/field-sales/context")).toBe(true);
    expect(canAccessPath("CUSTOMER", "/field-sales")).toBe(false);
    expect(canAccessPath("RSO", "/api/field-sales/sales")).toBe(false);
  });

  it("has a default dashboard for each role", () => {
    expect(defaultRouteByRole.RSO).toBe("/rso");
    expect(defaultRouteByRole.CUSTOMER).toBe("/customer");
  });
});
