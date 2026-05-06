import type { AppSession } from "@/lib/auth-types";
import { canChangeOrderStatus, canManageOrders, canViewOrders } from "@/lib/orders";

type AuthResult =
  | { ok: true; session: AppSession }
  | { ok: false; status: 401 | 403; error: string };

export function requireOrderViewSession(session: AppSession | null): AuthResult {
  if (!session) return { ok: false, status: 401, error: "Sign in to view orders." };
  if (!canViewOrders(session.user.role)) return { ok: false, status: 403, error: "Your role cannot view orders." };
  return { ok: true, session };
}

export function requireOrderManageSession(session: AppSession | null): AuthResult {
  if (!session) return { ok: false, status: 401, error: "Sign in to manage orders." };
  if (!canManageOrders(session.user.role)) return { ok: false, status: 403, error: "Your role cannot create or modify orders." };
  return { ok: true, session };
}

export function requireOrderStatusSession(session: AppSession | null): AuthResult {
  if (!session) return { ok: false, status: 401, error: "Sign in to update order status." };
  if (!canChangeOrderStatus(session.user.role)) return { ok: false, status: 403, error: "Your role cannot update order status." };
  return { ok: true, session };
}
