import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  getAssignedMasterLocationId,
  movementTouchesAssignedLocation
} from "@/lib/inventory-movement-access";
import { prisma } from "@/lib/prisma";
import {
  canReceiveSellingPointDispatch,
  sellingPointReceiveSchema
} from "@/lib/selling-point-distribution";
import {
  receiveSellingPointDispatch,
  sellingPointActionErrorMessage
} from "@/lib/selling-point-distribution-posting";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to receive selling point dispatches." }, { status: 401 });
  if (!canReceiveSellingPointDispatch(session.user.role)) return NextResponse.json({ error: "Your role cannot receive selling point dispatches." }, { status: 403 });

  const body = await request.json().catch(() => null) as { action?: string } | null;
  if (body?.action !== "receive") return NextResponse.json({ error: "Choose a valid selling point action." }, { status: 400 });

  const parsed = sellingPointReceiveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the receipt form." }, { status: 400 });
  }

  const movement = await prisma.inventoryMovement.findUnique({ where: { id: params.id } });
  if (!movement) return NextResponse.json({ error: "Dispatch not found." }, { status: 404 });

  if (["RSO", "MSO", "SERVICE_CENTRE_STAFF"].includes(session.user.role)) {
    const assignedLocationId = await getAssignedMasterLocationId(session.user.id);
    if (!movementTouchesAssignedLocation({ assignedLocationId, sourceLocationId: movement.sourceLocationId, destinationLocationId: movement.destinationLocationId })) {
      return NextResponse.json({ error: "You can receive stock only for your assigned location." }, { status: 403 });
    }
  }

  try {
    const updated = await receiveSellingPointDispatch(prisma, params.id, parsed.data, session.user.id);
    await writeAuditLog({
      action: "SELLING_POINT_DISPATCH_RECEIVED",
      category: "INVENTORY",
      details: `${updated.reference} received at selling point.`,
      entityType: "InventoryMovement",
      entityId: updated.id,
      session,
      request,
      metadata: { reference: updated.reference, status: updated.status, receivedQuantity: updated.receivedQuantity }
    }).catch(() => null);
    return NextResponse.json({ movement: updated });
  } catch (error) {
    if (error instanceof Error) {
      const message = sellingPointActionErrorMessage(error.message);
      if (message) return NextResponse.json({ error: message }, { status: 400 });
    }
    throw error;
  }
}
