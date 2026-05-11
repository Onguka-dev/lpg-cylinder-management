import type { Prisma, PrismaClient } from "@prisma/client";
import { normalizeCodeList, plantLocationCodes } from "@/lib/plant-refill-workflow";

type Db = PrismaClient;

export async function getPlantWorkflowLocations(db: Pick<Db, "masterDataRecord">) {
  const locations = await db.masterDataRecord.findMany({
    where: { code: { in: [plantLocationCodes.wandiege, plantLocationCodes.plant] } }
  });
  const wandiege = locations.find((location) => location.code === plantLocationCodes.wandiege);
  const plant = locations.find((location) => location.code === plantLocationCodes.plant);
  if (!wandiege || !plant) throw new Error("PLANT_WORKFLOW_LOCATIONS_MISSING");
  return { wandiege, plant };
}

export async function createAndDispatchPlantTransfer(
  db: Db,
  input: {
    reference: string;
    cylinderCodes: string[];
    vehicle: string;
    driver: string;
    sealNumber: string;
    dispatchNote?: string | null;
    expectedReceiptTime?: string | null;
    remarks?: string | null;
  },
  userId?: string | null
) {
  const { wandiege, plant } = await getPlantWorkflowLocations(db);
  const codes = normalizeCodeList(input.cylinderCodes);
  const cylinders = await db.cylinder.findMany({
    where: {
      currentLocationId: wandiege.id,
      status: "EMPTY",
      OR: [
        { serialNumber: { in: codes } },
        { barcode: { in: codes } },
        { factorySerialNo: { in: codes } },
        { qrCode: { in: codes } }
      ]
    },
    include: { sku: true }
  });

  if (cylinders.length !== codes.length) {
    throw new Error("Only empty cylinders currently located at Wandiege can be dispatched to the plant.");
  }

  const firstSkuId = cylinders[0]?.skuId;
  if (!firstSkuId) throw new Error("Select at least one empty cylinder.");

  return db.$transaction(async (tx) => {
    const movement = await tx.inventoryMovement.create({
      data: {
        reference: `${input.reference}-DISPATCH`,
        type: "TRANSFER",
        status: "DISPATCHED",
        skuId: firstSkuId,
        sourceLocationId: wandiege.id,
        destinationLocationId: plant.id,
        sourceStatus: "EMPTY",
        destinationStatus: "EMPTY_IN_TRANSIT",
        requestedQuantity: cylinders.length,
        approvedQuantity: cylinders.length,
        dispatchedQuantity: cylinders.length,
        requestedById: userId,
        approvedById: userId,
        dispatchedById: userId,
        approvedAt: new Date(),
        dispatchedAt: new Date(),
        notes: input.dispatchNote ?? `Empty cylinders dispatched to ${plant.name}.`
      }
    });

    const transfer = await tx.plantTransfer.create({
      data: {
        reference: input.reference,
        status: "DISPATCHED_TO_PLANT",
        sourceLocationId: wandiege.id,
        plantLocationId: plant.id,
        returnDestinationId: wandiege.id,
        vehicle: input.vehicle,
        driver: input.driver,
        sealNumber: input.sealNumber,
        dispatchNote: input.dispatchNote ?? null,
        expectedReceiptTime: input.expectedReceiptTime ? new Date(input.expectedReceiptTime) : null,
        remarks: input.remarks ?? null,
        dispatchMovementId: movement.id,
        createdById: userId,
        dispatchedById: userId,
        dispatchedAt: new Date(),
        lines: { create: cylinders.map((cylinder) => ({ cylinderId: cylinder.id })) }
      },
      include: { lines: true }
    });

    await tx.inventoryMovementHistory.create({
      data: {
        movementId: movement.id,
        toStatus: "DISPATCHED",
        action: "Plant transfer dispatched",
        details: `Dispatched ${cylinders.length} empty cylinder(s) from Wandiege to ${plant.name}.`,
        changedById: userId
      }
    });

    for (const cylinder of cylinders) {
      await tx.inventoryMovementCylinder.create({ data: { movementId: movement.id, cylinderId: cylinder.id } });
      await tx.cylinder.update({ where: { id: cylinder.id }, data: { status: "EMPTY_IN_TRANSIT" } });
      await tx.cylinderHistory.create({
        data: {
          cylinderId: cylinder.id,
          previousStatus: "EMPTY",
          newStatus: "EMPTY_IN_TRANSIT",
          previousLocationId: wandiege.id,
          newLocationId: wandiege.id,
          changedById: userId,
          reason: `Dispatched to plant transfer ${transfer.reference}`
        }
      });
    }

    return transfer;
  });
}

export async function receiveAtPlant(
  db: Db,
  transferId: string,
  input: { receivedCodes: string[]; damagedCodes?: string[]; extraCodes?: string[] },
  userId?: string | null
) {
  const transfer = await db.plantTransfer.findUnique({
    where: { id: transferId },
    include: { lines: { include: { cylinder: true } }, plantLocation: true }
  });
  if (!transfer) throw new Error("PLANT_TRANSFER_NOT_FOUND");

  const receivedCodes = new Set(normalizeCodeList(input.receivedCodes));
  const damagedCodes = new Set(normalizeCodeList(input.damagedCodes ?? []));
  const extraCodes = normalizeCodeList(input.extraCodes ?? []);

  return db.$transaction(async (tx) => {
    let varianceCount = 0;
    let receivedCount = 0;
    for (const line of transfer.lines) {
      const cylinderCodes = [line.cylinder.serialNumber, line.cylinder.barcode, line.cylinder.factorySerialNo, line.cylinder.qrCode]
        .filter(Boolean)
        .map((code) => String(code).toUpperCase());
      const isReceived = cylinderCodes.some((code) => receivedCodes.has(code));
      const isDamaged = cylinderCodes.some((code) => damagedCodes.has(code));

      if (isDamaged) {
        varianceCount += 1;
        await tx.plantTransferLine.update({ where: { id: line.id }, data: { status: "DAMAGED", receivedAt: new Date() } });
        await tx.cylinder.update({ where: { id: line.cylinderId }, data: { status: "DAMAGED", currentLocationId: transfer.plantLocationId, unsafeStatus: true, blockedReason: "Damaged on plant receipt." } });
        await createVariance(tx, transfer.id, line.id, line.cylinderId, "DAMAGED", `Cylinder ${line.cylinder.serialNumber} received damaged.`, userId);
      } else if (isReceived) {
        receivedCount += 1;
        await tx.plantTransferLine.update({ where: { id: line.id }, data: { status: "RECEIVED_AT_PLANT", receivedAt: new Date() } });
        await tx.cylinder.update({ where: { id: line.cylinderId }, data: { status: "EMPTY", currentLocationId: transfer.plantLocationId } });
      } else {
        varianceCount += 1;
        await tx.plantTransferLine.update({ where: { id: line.id }, data: { status: "MISSING" } });
        await createVariance(tx, transfer.id, line.id, line.cylinderId, "MISSING", `Cylinder ${line.cylinder.serialNumber} was not received at plant.`, userId);
      }
    }

    for (const code of extraCodes) {
      varianceCount += 1;
      await createVariance(tx, transfer.id, null, null, "EXTRA", `Extra cylinder scanned at plant receipt: ${code}.`, userId);
    }

    return tx.plantTransfer.update({
      where: { id: transfer.id },
      data: {
        status: varianceCount > 0 ? "VARIANCE_LOGGED" : "RECEIVED_AT_PLANT",
        plantReceivedById: userId ?? null,
        plantReceivedAt: new Date()
      },
      include: { lines: true, varianceCases: true }
    });
  });
}

export async function createRefillBatchAndMarkFilled(
  db: Db,
  transferId: string,
  input: { reference: string; transferLineIds: string[]; qualityInspectionStatus: "PASSED" | "FAILED"; qualityNotes?: string | null },
  userId?: string | null
) {
  const transfer = await db.plantTransfer.findUnique({ where: { id: transferId } });
  if (!transfer) throw new Error("PLANT_TRANSFER_NOT_FOUND");
  if (input.qualityInspectionStatus !== "PASSED") throw new Error("Quality inspection must pass before cylinders are marked filled.");

  const lines = await db.plantTransferLine.findMany({
    where: { id: { in: input.transferLineIds }, transferId, status: "RECEIVED_AT_PLANT" },
    include: { cylinder: true }
  });
  if (lines.length !== input.transferLineIds.length) throw new Error("Only received empty plant cylinders can be refilled.");

  return db.$transaction(async (tx) => {
    const batch = await tx.refillBatch.create({
      data: {
        reference: input.reference,
        transferId,
        plantLocationId: transfer.plantLocationId,
        status: "FILLED",
        qualityInspectionStatus: "PASSED",
        qualityNotes: input.qualityNotes ?? null,
        createdById: userId,
        qualityCheckedById: userId,
        qualityCheckedAt: new Date(),
        filledAt: new Date(),
        lines: {
          create: lines.map((line) => ({
            transferLineId: line.id,
            cylinderId: line.cylinderId
          }))
        }
      },
      include: { lines: true }
    });

    for (const line of lines) {
      await tx.plantTransferLine.update({ where: { id: line.id }, data: { status: "REFILLED" } });
      await tx.cylinder.update({ where: { id: line.cylinderId }, data: { status: "FILLED" } });
      await tx.cylinderHistory.create({
        data: {
          cylinderId: line.cylinderId,
          previousStatus: "EMPTY",
          newStatus: "FILLED",
          previousLocationId: transfer.plantLocationId,
          newLocationId: transfer.plantLocationId,
          changedById: userId,
          reason: `Refill batch ${input.reference} quality checked and filled`
        }
      });
    }

    await tx.plantTransfer.update({ where: { id: transferId }, data: { status: "REFILLED" } });
    return batch;
  });
}

export async function dispatchFilledBackToWandiege(
  db: Db,
  transferId: string,
  input: { vehicle: string; driver: string; sealNumber: string; remarks?: string | null },
  userId?: string | null
) {
  const transfer = await db.plantTransfer.findUnique({
    where: { id: transferId },
    include: { lines: { include: { cylinder: true } }, plantLocation: true, returnDestination: true }
  });
  if (!transfer) throw new Error("PLANT_TRANSFER_NOT_FOUND");
  const lines = transfer.lines.filter((line) => line.status === "REFILLED");
  if (!lines.length) throw new Error("No refilled cylinders are ready for return dispatch.");

  return db.$transaction(async (tx) => {
    for (const line of lines) {
      await tx.cylinder.update({ where: { id: line.cylinderId }, data: { status: "FILLED_IN_TRANSIT" } });
      await tx.cylinderHistory.create({
        data: {
          cylinderId: line.cylinderId,
          previousStatus: "FILLED",
          newStatus: "FILLED_IN_TRANSIT",
          previousLocationId: transfer.plantLocationId,
          newLocationId: transfer.plantLocationId,
          changedById: userId,
          reason: `Return dispatch from plant transfer ${transfer.reference}`
        }
      });
    }

    return tx.plantTransfer.update({
      where: { id: transfer.id },
      data: {
        status: "RETURN_DISPATCHED",
        vehicle: input.vehicle,
        driver: input.driver,
        sealNumber: input.sealNumber,
        remarks: input.remarks ?? transfer.remarks,
        returnDispatchedById: userId ?? null,
        returnDispatchedAt: new Date()
      },
      include: { lines: true }
    });
  });
}

export async function receiveFilledBackAtWandiege(
  db: Db,
  transferId: string,
  input: { receivedCodes: string[] },
  userId?: string | null
) {
  const transfer = await db.plantTransfer.findUnique({
    where: { id: transferId },
    include: { lines: { include: { cylinder: { include: { sku: true } } } }, returnDestination: true, plantLocation: true }
  });
  if (!transfer) throw new Error("PLANT_TRANSFER_NOT_FOUND");
  const receivedCodes = new Set(normalizeCodeList(input.receivedCodes));
  const returningLines = transfer.lines.filter((line) => line.cylinder.status === "FILLED_IN_TRANSIT");
  if (!returningLines.length) throw new Error("No filled cylinders are currently in transit back to Wandiege.");

  return db.$transaction(async (tx) => {
    const receivedLines: typeof returningLines = [];
    for (const line of returningLines) {
      const codes = [line.cylinder.serialNumber, line.cylinder.barcode, line.cylinder.factorySerialNo, line.cylinder.qrCode]
        .filter(Boolean)
        .map((code) => String(code).toUpperCase());
      if (!codes.some((code) => receivedCodes.has(code))) continue;

      receivedLines.push(line);
      await tx.plantTransferLine.update({ where: { id: line.id }, data: { status: "RETURNED_TO_WAREHOUSE", returnReceivedAt: new Date() } });
      await tx.cylinder.update({ where: { id: line.cylinderId }, data: { status: "FILLED_AT_WAREHOUSE", currentLocationId: transfer.returnDestinationId } });
      await tx.cylinderHistory.create({
        data: {
          cylinderId: line.cylinderId,
          previousStatus: "FILLED_IN_TRANSIT",
          newStatus: "FILLED_AT_WAREHOUSE",
          previousLocationId: transfer.plantLocationId,
          newLocationId: transfer.returnDestinationId,
          changedById: userId,
          reason: `Filled cylinder returned to Wandiege from ${transfer.reference}`
        }
      });
    }

    for (const line of returningLines.filter((line) => !receivedLines.some((received) => received.id === line.id))) {
      await createVariance(tx, transfer.id, line.id, line.cylinderId, "MISSING", `Returning filled cylinder ${line.cylinder.serialNumber} was not received at Wandiege.`, userId);
    }

    return tx.plantTransfer.update({
      where: { id: transfer.id },
      data: {
        status: receivedLines.length === returningLines.length ? "COMPLETED" : "VARIANCE_LOGGED",
        returnReceivedById: userId ?? null,
        returnReceivedAt: new Date()
      },
      include: { lines: true, varianceCases: true }
    });
  });
}

async function createVariance(
  tx: Prisma.TransactionClient,
  transferId: string,
  transferLineId: string | null,
  cylinderId: string | null,
  type: "MISSING" | "EXTRA" | "DAMAGED",
  details: string,
  userId?: string | null
) {
  const count = await tx.plantVarianceCase.count({ where: { transferId } });
  return tx.plantVarianceCase.create({
    data: {
      reference: `VAR-${transferId.slice(-6).toUpperCase()}-${String(count + 1).padStart(3, "0")}`,
      transferId,
      transferLineId,
      cylinderId,
      type,
      details,
      createdById: userId ?? null
    }
  });
}
