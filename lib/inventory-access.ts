import type { AppSession } from "@/lib/auth-types";
import { canManageInventory, canViewInventory } from "@/lib/inventory";

export function requireInventoryViewSession(session: AppSession | null) {
  if (!session) {
    return { ok: false as const, status: 401, error: "Sign in to continue." };
  }

  if (!canViewInventory(session.user.role)) {
    return { ok: false as const, status: 403, error: "You do not have access to inventory records." };
  }

  return { ok: true as const };
}

export function requireInventoryManageSession(session: AppSession | null) {
  if (!session) {
    return { ok: false as const, status: 401, error: "Sign in to continue." };
  }

  if (!canManageInventory(session.user.role)) {
    return { ok: false as const, status: 403, error: "Only Admin and Warehouse Manager users can manage cylinders." };
  }

  return { ok: true as const };
}
