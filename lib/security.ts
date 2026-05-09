import { z } from "zod";
import type { AppRole, AppSession } from "@/lib/auth-types";
import { passwordPolicy, validateStrongPassword } from "@/lib/passwords";

export const securityControlSeed = [
  {
    key: "password_policy",
    label: "Strong password policy",
    value: JSON.stringify(passwordPolicy),
    description: "Requires long passwords with uppercase, lowercase, number, and symbol characters."
  },
  {
    key: "mfa_readiness",
    label: "OTP/MFA readiness placeholder",
    value: "OTP provider not connected",
    description: "Tracks MFA readiness without sending live OTP messages in this stage."
  },
  {
    key: "session_timeout_minutes",
    label: "Session timeout",
    value: "120",
    description: "Signed-in sessions expire after two hours."
  },
  {
    key: "api_permission_enforcement",
    label: "Backend permission checks",
    value: "enabled",
    description: "Protected API routes require a valid session and role permission."
  }
] as const;

export const securitySettingSchema = z.object({
  key: z.string().trim().min(2),
  value: z.string().trim().min(1, "Enter a setting value.").max(300, "Setting value must be 300 characters or fewer."),
  isEnabled: z.coerce.boolean().default(true)
});

export function canViewSecurity(role: AppRole) {
  return role === "ADMIN" || role === "AUDITOR";
}

export function canManageSecurity(role: AppRole) {
  return role === "ADMIN";
}

export function assertApiPermission(session: AppSession | null, pathname: string, canAccessPath: (role: AppRole, path: string) => boolean) {
  if (!session) {
    return { ok: false as const, status: 401, error: "Sign in to continue." };
  }

  if (!canAccessPath(session.user.role, pathname)) {
    return { ok: false as const, status: 403, error: "Your role cannot perform this action." };
  }

  return { ok: true as const, session };
}

export function passwordPolicySummary() {
  return [
    `${passwordPolicy.minLength}+ characters`,
    "uppercase",
    "lowercase",
    "number",
    "symbol"
  ].join(", ");
}

export { validateStrongPassword };
