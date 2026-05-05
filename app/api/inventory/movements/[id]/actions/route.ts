import { NextResponse } from "next/server";
import { CylinderStatus, InventoryMovementStatus, Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import {
  getAssignedMasterLocationId,
  movementTouchesAssignedLocation,
  requireMovementApproveSession,
  requireMovementDispatchSession,
  requireMovementReceiveSession
} from "@/lib/inventory-movement-access";
import {
  canCreateReceiptCylinders,
  completesOnDispatch,
  movementActionSchema
} from "@/lib/inventory-movements";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentSession();
  const body = await request.json().catch(() => null);
  const parsed = movementActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the movement action and try again." },
      { status: 400 }
    );
  }

  const action = parsed.data.action;
  const auth =
    action === "approve" || action === "reject" || action === "log-variance" || action === "complete"
      ? requireMovementApproveSession(session)
      : action === "dispatch"
        ? requireMovementDispatchSession(session)
        : requireMovementReceiveSession(session);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const movement = await prisma.inventoryMovement.findUnique({
    where: { id: params.id },
    include: { cylinders: true }
  });

  if (!movement) {
    return NextResponse.json({ error: "Movement not found." }, { status: 404 });
  }

  if ((session?.user.role === "RSO" || session?.user.role === "MSO") && action === "receive") {
    const assignedLocationId = await getAssignedMasterLocationId(session.user.id);
    if (
      !movementTouchesAssignedLocation({
        assignedLocationId,
        sourceLocationId: movement.sourceLocationId,
        destinationLocationId: movement.destinationLocationId
      })
    ) {
      return NextResponse.json(
        { error: "RSO/MSO users can receive stock only for their assigned location." },
        { status: 403 }
      );
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (action === "approve") {
        if (movement.status !== "REQUESTED") throw new Error("INVALID_APPROVE_STATUS");

        const approvedQuantity = parsed.data.quantity ?? movement.requestedQuantity;
        const saved = await tx.inventoryMovement.update({
          where: { id: movement.id },
          data: {
            status: "APPROVED",
            approvedQuantity,
            approvedById: session?.user.id,
            approvedAt: new Date()
          }
        });
        await addHistory(tx, movement.id, movement.status, saved.status, "Movement approved", `${approvedQuantity} cylinder(s) approved.`, session?.user.id);
        return saved;
      }

      if (action === "reject") {
        if (movement.status !== "REQUESTED") throw new Error("INVALID_REJECT_STATUS");

        const saved = await tx.inventoryMovement.update({
          where: { id: movement.id },
          data: { status: "REJECTED" }
        });
        await addHistory(tx, movement.id, movement.status, saved.status, "Movement rejected", parsed.data.notes ?? "Movement rejected.", session?.user.id);
        return saved;
      }

      if (action === "dispatch") {
        if (movement.status !== "APPROVED") throw new Error("INVALID_DISPATCH_STATUS");
        if (!movement.sourceLocationId) throw new Error("SOURCE_REQUIRED");
        if (!movement.sourceStatus) throw new Error("SOURCE_STATUS_REQUIRED");

        const quantity = parsed.data.quantity ?? movement.approvedQuantity ?? movement.requestedQuantity;
        const cylinders = await tx.cylinder.findMany({
          where: {
            skuId: movement.skuId,
            currentLocationId: movement.sourceLocationId,
            status: movement.sourceStatus
          },
          orderBy: { createdAt: "asc" },
          take: quantity
        });

        if (cylinders.length < quantity) throw new Error("INSUFFICIENT_STOCK");

        const nextStatus = completesOnDispatch(movement.type) ? movement.destinationStatus : CylinderStatus.IN_TRANSIT;
        const nextLocationId = movement.destinationLocationId ?? movement.sourceLocationId;

        for (const cylinder of cylinders) {
          await tx.inventoryMovementCylinder.create({
            data: { movementId: movement.id, cylinderId: cylinder.id }
          });
          await tx.cylinder.update({
            where: { id: cylinder.id },
            data: { status: nextStatus, currentLocationId: nextLocationId }
          });
          await tx.cylinderHistory.create({
            data: {
              cylinderId: cylinder.id,
              previousStatus: cylinder.status,
              newStatus: nextStatus,
              previousLocationId: cylinder.currentLocationId,
              newLocationId: nextLocationId,
              changedById: session?.user.id,
              reason: `Inventory movement ${movement.reference} dispatched`
            }
          });
        }

        const finalStatus = completesOnDispatch(movement.type) ? InventoryMovementStatus.COMPLETED : InventoryMovementStatus.DISPATCHED;
        const saved = await tx.inventoryMovement.update({
          where: { id: movement.id },
          data: {
            status: finalStatus,
            dispatchedQuantity: quantity,
            receivedQuantity: completesOnDispatch(movement.type) ? quantity : null,
            completedAt: completesOnDispatch(movement.type) ? new Date() : null,
            dispatchedById: session?.user.id,
            dispatchedAt: new Date()
          }
        });
        await addHistory(tx, movement.id, movement.status, saved.status, "Movement dispatched", `${quantity} cylinder(s) dispatched.`, session?.user.id);
        return saved;
      }

      if (action === "receive") {
        if (!["APPROVED", "DISPATCHED"].includes(movement.status)) throw new Error("INVALID_RECEIVE_STATUS");
        if (!movement.destinationLocationId) throw new Error("DESTINATION_REQUIRED");

        const plannedQuantity = movement.dispatchedQuantity ?? movement.approvedQuantity ?? movement.requestedQuantity;
        const receivedQuantity = parsed.data.quantity ?? plannedQuantity;
        const varianceQuantity = plannedQuantity - receivedQuantity;
        const status = varianceQuantity === 0 ? InventoryMovementStatus.COMPLETED : InventoryMovementStatus.VARIANCE_LOGGED;

        if (movement.status === "DISPATCHED") {
          const linked = await tx.inventoryMovementCylinder.findMany({
            where: { movementId: movement.id },
            include: { cylinder: true },
            orderBy: { createdAt: "asc" },
            take: receivedQuantity
          });

          for (const line of linked) {
            await tx.cylinder.update({
              where: { id: line.cylinderId },
              data: {
                status: movement.destinationStatus,
                currentLocationId: movement.destinationLocationId
              }
            });
            await tx.cylinderHistory.create({
              data: {
                cylinderId: line.cylinderId,
                previousStatus: line.cylinder.status,
                newStatus: movement.destinationStatus,
                previousLocationId: line.cylinder.currentLocationId,
                newLocationId: movement.destinationLocationId,
                changedById: session?.user.id,
                reason: `Inventory movement ${movement.reference} received`
              }
            });
          }
        } else {
          if (!canCreateReceiptCylinders(movement.type)) throw new Error("RECEIPT_NOT_ALLOWED");

          for (let index = 1; index <= receivedQuantity; index += 1) {
            const serial = `${movement.reference}-RCV-${String(index).padStart(3, "0")}`;
            const cylinder = await tx.cylinder.create({
              data: {
                serialNumber: serial,
                barcode: `${serial}-RFID`,
                skuId: movement.skuId,
                currentLocationId: movement.destinationLocationId,
                status: movement.destinationStatus,
                notes: `Created from inventory movement ${movement.reference}`
              }
            });
            await tx.inventoryMovementCylinder.create({
              data: { movementId: movement.id, cylinderId: cylinder.id }
            });
            await tx.cylinderHistory.create({
              data: {
                cylinderId: cylinder.id,
                newStatus: cylinder.status,
                newLocationId: cylinder.currentLocationId,
                changedById: session?.user.id,
                reason: `Inventory movement ${movement.reference} received`
              }
            });
          }
        }

        const saved = await tx.inventoryMovement.update({
          where: { id: movement.id },
          data: {
            status,
            receivedQuantity,
            varianceQuantity,
            varianceReason: varianceQuantity === 0 ? null : parsed.data.varianceReason ?? "Variance requires follow-up.",
            receivedById: session?.user.id,
            receivedAt: new Date(),
            completedAt: status === "COMPLETED" ? new Date() : null
          }
        });
        await addHistory(tx, movement.id, movement.status, saved.status, "Movement received", `${receivedQuantity} cylinder(s) received. Variance: ${varianceQuantity}.`, session?.user.id);
        return saved;
      }

      if (action === "log-variance") {
        if (!["DISPATCHED", "VARIANCE_LOGGED"].includes(movement.status)) throw new Error("INVALID_VARIANCE_STATUS");

        const saved = await tx.inventoryMovement.update({
          where: { id: movement.id },
          data: {
            status: "VARIANCE_LOGGED",
            varianceReason: parsed.data.varianceReason ?? parsed.data.notes ?? "Variance logged for review."
          }
        });
        await addHistory(tx, movement.id, movement.status, saved.status, "Variance logged", saved.varianceReason ?? "Variance logged.", session?.user.id);
        return saved;
      }

      if (action === "complete") {
        if (movement.status !== "VARIANCE_LOGGED") throw new Error("INVALID_COMPLETE_STATUS");

        const saved = await tx.inventoryMovement.update({
          where: { id: movement.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date()
          }
        });
        await addHistory(tx, movement.id, movement.status, saved.status, "Movement completed", parsed.data.notes ?? "Variance reviewed and movement completed.", session?.user.id);
        return saved;
      }

      throw new Error("UNKNOWN_ACTION");
    });

    return NextResponse.json({ movement: updated });
  } catch (error) {
    if (error instanceof Error) {
      const message = actionErrorMessage(error.message);
      if (message) return NextResponse.json({ error: message }, { status: 400 });
    }

    throw error;
  }
}

async function addHistory(
  tx: Prisma.TransactionClient,
  movementId: string,
  fromStatus: InventoryMovementStatus,
  toStatus: InventoryMovementStatus,
  action: string,
  details: string,
  changedById?: string
) {
  await tx.inventoryMovementHistory.create({
    data: {
      movementId,
      fromStatus,
      toStatus,
      action,
      details,
      changedById
    }
  });
}

function actionErrorMessage(message: string) {
  const messages: Record<string, string> = {
    INVALID_APPROVE_STATUS: "Only requested movements can be approved.",
    INVALID_REJECT_STATUS: "Only requested movements can be rejected.",
    INVALID_DISPATCH_STATUS: "Only approved movements can be dispatched.",
    INVALID_RECEIVE_STATUS: "Only approved receipts or dispatched transfers can be received.",
    INVALID_VARIANCE_STATUS: "Only dispatched or variance movements can have variance notes logged.",
    INVALID_COMPLETE_STATUS: "Only variance-logged movements can be completed.",
    SOURCE_REQUIRED: "This movement needs a source location before dispatch.",
    SOURCE_STATUS_REQUIRED: "This movement needs a source status before dispatch.",
    DESTINATION_REQUIRED: "This movement needs a destination location before receiving.",
    INSUFFICIENT_STOCK: "There is not enough available stock at the source location for this dispatch.",
    RECEIPT_NOT_ALLOWED: "This movement type must be dispatched before it can be received."
  };

  return messages[message];
}
