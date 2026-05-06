import type { AppSession } from "@/lib/auth-types";
import { getAssignedMasterLocationId } from "@/lib/inventory-movement-access";
import { canManageRefillSales, canViewRefillSales } from "@/lib/refill-sales";

type AuthResult =
  | { ok: true; session: AppSession }
  | { ok: false; status: 401 | 403; error: string };

export function requireRefillSalesViewSession(session: AppSession | null): AuthResult {
  if (!session) return { ok: false, status: 401, error: "Sign in to view refill sales." };
  if (!canViewRefillSales(session.user.role)) {
    return { ok: false, status: 403, error: "Your role cannot view refill sales." };
  }
  return { ok: true, session };
}

export function requireRefillSalesManageSession(session: AppSession | null): AuthResult {
  if (!session) return { ok: false, status: 401, error: "Sign in to create refill sales." };
  if (!canManageRefillSales(session.user.role)) {
    return { ok: false, status: 403, error: "Only Admin and RSO users can create refill sales." };
  }
  return { ok: true, session };
}

export async function getSalesLocationForSession(session: AppSession) {
  return getAssignedMasterLocationId(session.user.id);
}
