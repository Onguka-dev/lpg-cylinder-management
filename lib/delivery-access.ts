import type { AppSession } from "@/lib/auth-types";
import { canManageDeliveries, canUpdateDeliveryStatus, canViewDeliveries } from "@/lib/deliveries";

type AuthResult =
  | { ok: true; session: AppSession }
  | { ok: false; status: 401 | 403; error: string };

export function requireDeliveryViewSession(session: AppSession | null): AuthResult {
  if (!session) return { ok: false, status: 401, error: "Sign in to view deliveries." };
  if (!canViewDeliveries(session.user.role)) return { ok: false, status: 403, error: "Your role cannot view deliveries." };
  return { ok: true, session };
}

export function requireDeliveryManageSession(session: AppSession | null): AuthResult {
  if (!session) return { ok: false, status: 401, error: "Sign in to manage deliveries." };
  if (!canManageDeliveries(session.user.role)) return { ok: false, status: 403, error: "Your role cannot assign deliveries." };
  return { ok: true, session };
}

export function requireDeliveryStatusSession(session: AppSession | null): AuthResult {
  if (!session) return { ok: false, status: 401, error: "Sign in to update delivery status." };
  if (!canUpdateDeliveryStatus(session.user.role)) return { ok: false, status: 403, error: "Your role cannot update delivery status." };
  return { ok: true, session };
}
