import { describe, expect, it } from "vitest";
import { auditCategoryForAction, auditCategories } from "@/lib/audit";
import { validateStrongPassword } from "@/lib/passwords";
import {
  canManageSecurity,
  canViewSecurity,
  passwordPolicySummary,
  securityControlSeed,
  securitySettingSchema
} from "@/lib/security";

describe("security controls", () => {
  it("enforces a strong password policy for new production passwords", () => {
    expect(validateStrongPassword("password123").length).toBeGreaterThan(0);
    expect(validateStrongPassword("StrongerPass123!")).toEqual([]);
    expect(passwordPolicySummary()).toContain("12+ characters");
  });

  it("defines MFA, session timeout, and permission control seed settings", () => {
    expect(securityControlSeed.map((setting) => setting.key)).toEqual([
      "password_policy",
      "mfa_readiness",
      "session_timeout_minutes",
      "api_permission_enforcement"
    ]);
  });

  it("keeps security management admin-only with auditor review access", () => {
    expect(canViewSecurity("ADMIN")).toBe(true);
    expect(canViewSecurity("AUDITOR")).toBe(true);
    expect(canViewSecurity("WAREHOUSE_MANAGER")).toBe(false);
    expect(canManageSecurity("ADMIN")).toBe(true);
    expect(canManageSecurity("AUDITOR")).toBe(false);
  });

  it("validates security setting updates clearly", () => {
    expect(securitySettingSchema.safeParse({ key: "session_timeout_minutes", value: "120", isEnabled: true }).success).toBe(true);
    expect(securitySettingSchema.safeParse({ key: "session_timeout_minutes", value: "" }).success).toBe(false);
  });

  it("covers audit categories for the Stage 17 control surface", () => {
    expect(auditCategories).toContain("AUTH");
    expect(auditCategories).toContain("MASTER_DATA");
    expect(auditCategories).toContain("CUSTOMER");
    expect(auditCategories).toContain("INVENTORY");
    expect(auditCategories).toContain("RECONCILIATION");
    expect(auditCategories).toContain("COMPLIANCE");
    expect(auditCategoryForAction("PAYMENT_RECORDED")).toBe("PAYMENT");
  });
});
