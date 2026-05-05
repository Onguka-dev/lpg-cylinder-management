import type { AppSession } from "@/lib/auth-types";
import { canManageCustomers, canViewCustomers } from "@/lib/customers";

export function requireCustomerViewSession(session: AppSession | null) {
  if (!session) {
    return { ok: false as const, status: 401, error: "Sign in to continue." };
  }

  if (!canViewCustomers(session.user.role)) {
    return { ok: false as const, status: 403, error: "You do not have access to customer records." };
  }

  return { ok: true as const };
}

export function requireCustomerManageSession(session: AppSession | null) {
  if (!session) {
    return { ok: false as const, status: 401, error: "Sign in to continue." };
  }

  if (!canManageCustomers(session.user.role)) {
    return { ok: false as const, status: 403, error: "Only Admin, RSO, and MSO users can manage customers." };
  }

  return { ok: true as const };
}
