import type { AppSession } from "@/lib/auth-types";
import { canManageBilling, canViewBilling } from "@/lib/billing";

type AuthResult =
  | { ok: true; session: AppSession }
  | { ok: false; status: 401 | 403; error: string };

export function requireBillingViewSession(session: AppSession | null): AuthResult {
  if (!session) return { ok: false, status: 401, error: "Sign in to view billing." };
  if (!canViewBilling(session.user.role)) return { ok: false, status: 403, error: "Your role cannot view billing." };
  return { ok: true, session };
}

export function requireBillingManageSession(session: AppSession | null): AuthResult {
  if (!session) return { ok: false, status: 401, error: "Sign in to manage billing." };
  if (!canManageBilling(session.user.role)) return { ok: false, status: 403, error: "Your role cannot create invoices or record payments." };
  return { ok: true, session };
}
