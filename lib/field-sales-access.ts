import type { AppSession } from "@/lib/auth-types";
import { prisma } from "@/lib/prisma";
import { canManageFieldSales, canViewFieldSales } from "@/lib/field-sales";

type AuthResult =
  | { ok: true; session: AppSession }
  | { ok: false; status: 401 | 403; error: string };

export function requireFieldSalesViewSession(session: AppSession | null): AuthResult {
  if (!session) return { ok: false, status: 401, error: "Sign in to view field sales." };
  if (!canViewFieldSales(session.user.role)) {
    return { ok: false, status: 403, error: "Your role cannot view field sales." };
  }
  return { ok: true, session };
}

export function requireFieldSalesManageSession(session: AppSession | null): AuthResult {
  if (!session) return { ok: false, status: 401, error: "Sign in to create field sales." };
  if (!canManageFieldSales(session.user.role)) {
    return { ok: false, status: 403, error: "Only Admin and MSO users can create field sales." };
  }
  return { ok: true, session };
}

export async function getFieldAssignment() {
  const [vehicle, route, zone] = await Promise.all([
    prisma.masterDataRecord.findFirst({
      where: { type: "VEHICLE", isActive: true },
      orderBy: { code: "asc" }
    }),
    prisma.masterDataRecord.findFirst({
      where: { type: "ROUTE", isActive: true },
      orderBy: { code: "asc" }
    }),
    prisma.masterDataRecord.findFirst({
      where: { type: "ZONE", isActive: true },
      orderBy: { code: "asc" }
    })
  ]);

  return {
    vehicle,
    route,
    zone: route?.parentId
      ? await prisma.masterDataRecord.findUnique({ where: { id: route.parentId } })
      : zone
  };
}
