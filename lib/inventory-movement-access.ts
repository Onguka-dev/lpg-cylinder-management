import type { AppSession } from "@/lib/auth-types";
import {
  canApproveInventoryMovements,
  canDispatchInventoryMovements,
  canReceiveInventoryMovements,
  canRequestInventoryMovements,
  canViewInventoryMovements
} from "@/lib/inventory-movements";
import { prisma } from "@/lib/prisma";

type AuthResult =
  | { ok: true; session: AppSession }
  | { ok: false; status: 401 | 403; error: string };

export function requireMovementViewSession(session: AppSession | null): AuthResult {
  if (!session) return { ok: false, status: 401, error: "Sign in to view inventory movements." };
  if (!canViewInventoryMovements(session.user.role)) {
    return { ok: false, status: 403, error: "Your role cannot view inventory movements." };
  }
  return { ok: true, session };
}

export function requireMovementRequestSession(session: AppSession | null): AuthResult {
  if (!session) return { ok: false, status: 401, error: "Sign in to request inventory movements." };
  if (!canRequestInventoryMovements(session.user.role)) {
    return { ok: false, status: 403, error: "Your role cannot request inventory movements." };
  }
  return { ok: true, session };
}

export function requireMovementApproveSession(session: AppSession | null): AuthResult {
  if (!session) return { ok: false, status: 401, error: "Sign in to approve inventory movements." };
  if (!canApproveInventoryMovements(session.user.role)) {
    return { ok: false, status: 403, error: "Only Admin and Warehouse Manager users can approve movements." };
  }
  return { ok: true, session };
}

export function requireMovementDispatchSession(session: AppSession | null): AuthResult {
  if (!session) return { ok: false, status: 401, error: "Sign in to dispatch inventory movements." };
  if (!canDispatchInventoryMovements(session.user.role)) {
    return { ok: false, status: 403, error: "Only Admin and Warehouse Manager users can dispatch movements." };
  }
  return { ok: true, session };
}

export function requireMovementReceiveSession(session: AppSession | null): AuthResult {
  if (!session) return { ok: false, status: 401, error: "Sign in to receive inventory movements." };
  if (!canReceiveInventoryMovements(session.user.role)) {
    return { ok: false, status: 403, error: "Your role cannot receive inventory movements." };
  }
  return { ok: true, session };
}

export async function getAssignedMasterLocationId(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { location: true }
  });

  if (!user?.location?.code) return null;

  const assignedLocation = await prisma.masterDataRecord.findFirst({
    where: {
      code: user.location.code,
      type: { in: ["LOCATION", "WAREHOUSE", "RETAIL_OUTLET", "MAINTENANCE_LOCATION", "DAMAGED_QUARANTINE_LOCATION"] },
      isActive: true
    },
    select: { id: true }
  });

  return assignedLocation?.id ?? null;
}

export function movementTouchesAssignedLocation({
  assignedLocationId,
  sourceLocationId,
  destinationLocationId
}: {
  assignedLocationId: string | null;
  sourceLocationId?: string | null;
  destinationLocationId?: string | null;
}) {
  return Boolean(
    assignedLocationId &&
      (sourceLocationId === assignedLocationId || destinationLocationId === assignedLocationId)
  );
}
