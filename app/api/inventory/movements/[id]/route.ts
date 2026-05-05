import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import {
  getAssignedMasterLocationId,
  movementTouchesAssignedLocation,
  requireMovementViewSession
} from "@/lib/inventory-movement-access";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();
  const auth = requireMovementViewSession(session);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const movement = await prisma.inventoryMovement.findUnique({
    where: { id: params.id },
    include: {
      sku: true,
      sourceLocation: true,
      destinationLocation: true,
      requestedBy: true,
      approvedBy: true,
      dispatchedBy: true,
      receivedBy: true,
      cylinders: { include: { cylinder: true }, orderBy: { createdAt: "asc" } },
      historyEntries: {
        orderBy: { createdAt: "desc" },
        include: { changedBy: true }
      }
    }
  });

  if (!movement) {
    return NextResponse.json({ error: "Movement not found." }, { status: 404 });
  }

  if (session?.user.role === "RSO" || session?.user.role === "MSO") {
    const assignedLocationId = await getAssignedMasterLocationId(session.user.id);
    if (
      !movementTouchesAssignedLocation({
        assignedLocationId,
        sourceLocationId: movement.sourceLocationId,
        destinationLocationId: movement.destinationLocationId
      })
    ) {
      return NextResponse.json(
        { error: "This movement is outside your assigned location." },
        { status: 403 }
      );
    }
  }

  return NextResponse.json({ movement });
}
