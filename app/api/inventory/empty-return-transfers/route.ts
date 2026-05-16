import { NextResponse } from "next/server";
import { InventoryMovementStatus } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { getAssignedMasterLocationId } from "@/lib/inventory-movement-access";
import { prisma } from "@/lib/prisma";
import {
  canDispatchEmptyReturns,
  canViewEmptyReturns,
  emptyReturnTransferSchema
} from "@/lib/reverse-logistics";
import {
  buildReverseLogisticsSearchWhere,
  createEmptyReturnTransfer,
  reverseLogisticsErrorMessage
} from "@/lib/reverse-logistics-posting";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to view empty return transfers." }, { status: 401 });
  if (!canViewEmptyReturns(session.user.role)) return NextResponse.json({ error: "Your role cannot view empty return transfers." }, { status: 403 });
  const url = new URL(request.url);
  const status = Object.values(InventoryMovementStatus).includes(url.searchParams.get("status") as InventoryMovementStatus)
    ? url.searchParams.get("status")
    : null;
  const movements = await prisma.inventoryMovement.findMany({
    where: buildReverseLogisticsSearchWhere(url.searchParams.get("q"), status),
    include: { sku: true, sourceLocation: true, destinationLocation: true, cylinders: { include: { cylinder: true } } },
    orderBy: { updatedAt: "desc" },
    take: 150
  });
  return NextResponse.json({ movements });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to dispatch empty returns." }, { status: 401 });
  if (!canDispatchEmptyReturns(session.user.role)) return NextResponse.json({ error: "Your role cannot dispatch empty returns." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const parsed = emptyReturnTransferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the empty return transfer form." }, { status: 400 });
  }

  const sourceLocationId = session.user.role === "ADMIN"
    ? parsed.data.sourceLocationId || null
    : await getAssignedMasterLocationId(session.user.id);
  if (!sourceLocationId) return NextResponse.json({ error: "No assigned selling point found for this user." }, { status: 400 });

  try {
    const movements = await createEmptyReturnTransfer(prisma, parsed.data, sourceLocationId, session.user.id);
    return NextResponse.json({ movements }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const message = reverseLogisticsErrorMessage(error.message);
      if (message) return NextResponse.json({ error: message }, { status: 400 });
    }
    throw error;
  }
}
