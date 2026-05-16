import type { CylinderStatus, Prisma, PrismaClient } from "@prisma/client";
import { assertNoOpenCustomerCustody } from "@/lib/inventory";
import { createMockNotification } from "@/lib/notifications";
import {
  isDamagedReturnCondition,
  normalizeReverseCode,
  reverseWarehouseCodes,
  type EmptyReturnInput,
  type EmptyReturnTransferInput
} from "@/lib/reverse-logistics";

type Db = PrismaClient;

export async function getReverseLogisticsLocations(db: Pick<Db, "masterDataRecord">) {
  const locations = await db.masterDataRecord.findMany({
    where: {
      code: { in: [...reverseWarehouseCodes] },
      type: "WAREHOUSE",
      isActive: true
    },
    orderBy: { name: "asc" }
  });
  return { warehouses: locations };
}

export async function recordCustomerEmptyReturn(
  db: Db,
  input: EmptyReturnInput,
  locationId: string,
  userId?: string | null
) {
  const condition = input.condition;
  const damaged = isDamagedReturnCondition(condition);
  const code = normalizeReverseCode(input.noCode ? input.serialNumber ?? "" : input.cylinderCode ?? "");

  return db.$transaction(async (tx) => {
    const customer = input.customerId
      ? await tx.customer.findUnique({ where: { id: input.customerId } })
      : await tx.customer.findFirst({ where: { phone: input.customerPhone?.trim() } });
    if (!customer) throw new Error("RETURN_CUSTOMER_NOT_FOUND");

    let cylinder = await tx.cylinder.findFirst({
      where: {
        OR: [
          { barcode: { equals: code, mode: "insensitive" } },
          { serialNumber: { equals: code, mode: "insensitive" } },
          { factorySerialNo: { equals: code, mode: "insensitive" } },
          { qrCode: { equals: code, mode: "insensitive" } }
        ]
      },
      include: { sku: true }
    });

    const openCustody = cylinder
      ? await tx.customerCylinderCustody.findFirst({ where: { cylinderId: cylinder.id, returnDate: null } })
      : null;
    if (openCustody && openCustody.customerId !== customer.id) throw new Error("RETURN_CUSTODY_DIFFERENT_CUSTOMER");

    if (!cylinder) {
      const sku = await tx.masterDataRecord.findFirst({
        where: { type: "SKU_MASTER", capacityKg: input.cylinderSizeKg ?? undefined, isActive: true }
      });
      if (!sku) throw new Error("RETURN_SKU_NOT_FOUND");
      cylinder = await tx.cylinder.create({
        data: {
          serialNumber: code,
          barcode: input.noCode ? null : code,
          factorySerialNo: code,
          cylinderSizeKg: input.cylinderSizeKg ?? sku.capacityKg,
          skuId: sku.id,
          currentLocationId: locationId,
          status: damaged ? "DAMAGED" : "EMPTY_AT_SELLING_POINT",
          unsafeStatus: damaged,
          quarantinedStatus: damaged,
          blockedReason: damaged ? `Customer empty return condition: ${condition}` : null,
          notes: `Customer empty return logged as ${condition}. ${input.remarks?.trim() ?? ""}`.trim()
        },
        include: { sku: true }
      });
    }

    const previousStatus = cylinder.status;
    const previousLocationId = cylinder.currentLocationId;
    const nextStatus: CylinderStatus = damaged ? "DAMAGED" : "EMPTY_AT_SELLING_POINT";

    await tx.cylinder.update({
      where: { id: cylinder.id },
      data: {
        currentLocationId: locationId,
        status: nextStatus,
        unsafeStatus: damaged ? true : cylinder.unsafeStatus,
        quarantinedStatus: damaged ? true : cylinder.quarantinedStatus,
        blockedReason: damaged ? `Customer empty return condition: ${condition}` : cylinder.blockedReason,
        notes: `Customer empty return from ${customer.name}; condition ${condition}. ${input.remarks?.trim() ?? ""}`.trim()
      }
    });

    if (openCustody) {
      await tx.customerCylinderCustody.update({
        where: { id: openCustody.id },
        data: {
          returnDate: new Date(),
          returnLocationId: locationId,
          notes: openCustody.notes ? `${openCustody.notes}\nReturned empty condition: ${condition}.` : `Returned empty condition: ${condition}.`
        }
      });
    } else {
      assertNoOpenCustomerCustody(0);
    }

    await tx.scanEvent.create({
      data: {
        barcode: code,
        action: input.noCode ? "NON_CODED_INTAKE" : "CUSTOMER_RETURN",
        result: "PERMITTED",
        expectedStatus: "WITH_CUSTOMER",
        scannedStatus: previousStatus,
        expectedLocationId: locationId,
        scannedLocationId: previousLocationId,
        cylinderId: cylinder.id,
        userId: userId ?? null,
        metadata: { condition, damaged, customerId: customer.id, noCode: Boolean(input.noCode) }
      }
    });

    await tx.cylinderHistory.create({
      data: {
        cylinderId: cylinder.id,
        previousStatus,
        newStatus: nextStatus,
        previousLocationId,
        newLocationId: locationId,
        changedById: userId,
        reason: damaged ? `Customer empty return routed to quarantine: ${condition}` : `Customer empty return accepted: ${condition}`
      }
    });

    await tx.auditLog.create({
      data: {
        action: damaged ? "CUSTOMER_EMPTY_RETURN_QUARANTINED" : "CUSTOMER_EMPTY_RETURN_ACCEPTED",
        category: "INVENTORY",
        details: `Empty cylinder ${cylinder.serialNumber} returned by ${customer.name} with condition ${condition}.`,
        entityType: "Cylinder",
        entityId: cylinder.id,
        userId: userId ?? null,
        metadata: { condition, customerId: customer.id, returnLocationId: locationId }
      }
    });

    if (openCustody?.expectedReturnFollowUpDate && openCustody.expectedReturnFollowUpDate < new Date()) {
      await createMockNotification(tx, {
        eventType: "PENDING_DELIVERY_ALERT",
        channel: "SMS",
        recipientName: customer.name,
        recipientContact: customer.phone,
        payload: { cylinder: cylinder.serialNumber, reason: "overdue-custody-return-closed" },
        createdById: userId ?? null
      });
    }

    return tx.cylinder.findUnique({
      where: { id: cylinder.id },
      include: { sku: true, currentLocation: true, customerCustodies: { include: { customer: true }, orderBy: { updatedAt: "desc" }, take: 1 } }
    });
  });
}

export async function createEmptyReturnTransfer(
  db: Db,
  input: EmptyReturnTransferInput,
  sourceLocationId: string,
  userId?: string | null
) {
  const codes = input.cylinderCodes.map(normalizeReverseCode);
  const destination = await db.masterDataRecord.findUnique({ where: { id: input.destinationLocationId } });
  if (!destination || !reverseWarehouseCodes.includes(destination.code as never)) throw new Error("RETURN_WAREHOUSE_NOT_ALLOWED");

  const cylinders = await db.cylinder.findMany({
    where: {
      currentLocationId: sourceLocationId,
      status: "EMPTY_AT_SELLING_POINT",
      activeStatus: true,
      unsafeStatus: false,
      quarantinedStatus: false,
      OR: [
        { serialNumber: { in: codes } },
        { barcode: { in: codes } },
        { factorySerialNo: { in: codes } },
        { qrCode: { in: codes } }
      ]
    },
    include: { sku: true }
  });
  if (cylinders.length !== new Set(codes).size) throw new Error("ONLY_EMPTY_SELLING_POINT_RETURNS_CAN_DISPATCH");

  return db.$transaction(async (tx) => {
    const grouped = new Map<string, typeof cylinders>();
    for (const cylinder of cylinders) grouped.set(cylinder.skuId, [...(grouped.get(cylinder.skuId) ?? []), cylinder]);
    const movements = [];
    for (const [skuId, group] of Array.from(grouped.entries())) {
      const movement = await tx.inventoryMovement.create({
        data: {
          reference: `${input.reference.trim().toUpperCase()}-${group[0].sku.code}`,
          type: "RETURN_FROM_VEHICLE",
          status: "DISPATCHED",
          skuId,
          sourceLocationId,
          destinationLocationId: destination.id,
          sourceStatus: "EMPTY_AT_SELLING_POINT",
          destinationStatus: "EMPTY_AT_WAREHOUSE",
          requestedQuantity: group.length,
          approvedQuantity: group.length,
          dispatchedQuantity: group.length,
          vehicle: input.vehicle.trim(),
          driverSalesRep: input.driverSalesRep.trim(),
          route: input.route.trim(),
          dispatchOfficerName: input.dispatchOfficerName.trim(),
          receivingOfficerName: input.receivingOfficerName.trim(),
          transferDateTime: new Date(input.transferDateTime),
          expectedReceiptAt: input.expectedReceiptAt ? new Date(input.expectedReceiptAt) : null,
          notes: input.remarks?.trim() || `Empty return transfer to ${destination.name}.`,
          requestedById: userId,
          approvedById: userId,
          dispatchedById: userId,
          approvedAt: new Date(),
          dispatchedAt: new Date()
        }
      });

      for (const cylinder of group) {
        await tx.inventoryMovementCylinder.create({ data: { movementId: movement.id, cylinderId: cylinder.id } });
        await tx.cylinder.update({ where: { id: cylinder.id }, data: { status: "EMPTY_IN_TRANSIT" } });
        await tx.cylinderHistory.create({
          data: {
            cylinderId: cylinder.id,
            previousStatus: cylinder.status,
            newStatus: "EMPTY_IN_TRANSIT",
            previousLocationId: cylinder.currentLocationId,
            newLocationId: cylinder.currentLocationId,
            changedById: userId,
            reason: `Empty return dispatch ${movement.reference}`
          }
        });
      }

      await tx.inventoryMovementHistory.create({
        data: {
          movementId: movement.id,
          toStatus: "DISPATCHED",
          action: "Empty return dispatch",
          details: `Dispatched ${group.length} empty cylinder(s) to ${destination.name}.`,
          changedById: userId
        }
      });
      movements.push(movement);
    }
    return movements;
  });
}

export async function receiveEmptyReturnTransfer(
  db: Db,
  movementId: string,
  input: { receivedCodes: string[]; receivingOfficerName?: string | null; remarks?: string | null },
  userId?: string | null
) {
  const movement = await db.inventoryMovement.findUnique({
    where: { id: movementId },
    include: { cylinders: { include: { cylinder: true } }, destinationLocation: true }
  });
  if (!movement) throw new Error("RETURN_TRANSFER_NOT_FOUND");
  if (movement.status !== "DISPATCHED" || movement.type !== "RETURN_FROM_VEHICLE") throw new Error("RETURN_TRANSFER_NOT_RECEIVABLE");
  if (!movement.destinationLocationId || !movement.destinationLocation) throw new Error("RETURN_WAREHOUSE_REQUIRED");
  const destinationLocationId = movement.destinationLocationId;
  const destinationLocationName = movement.destinationLocation.name;
  const codes = new Set(input.receivedCodes.map(normalizeReverseCode));
  const receivedLines = movement.cylinders.filter((line) => [line.cylinder.serialNumber, line.cylinder.barcode, line.cylinder.factorySerialNo, line.cylinder.qrCode].filter(Boolean).some((code) => codes.has(String(code).toUpperCase())));
  if (!receivedLines.length) throw new Error("RETURN_TRANSFER_NO_MATCHING_SCANS");

  return db.$transaction(async (tx) => {
    for (const line of receivedLines) {
      await tx.cylinder.update({
        where: { id: line.cylinderId },
        data: { status: "EMPTY_AT_WAREHOUSE", currentLocationId: destinationLocationId }
      });
      await tx.cylinderHistory.create({
        data: {
          cylinderId: line.cylinderId,
          previousStatus: line.cylinder.status,
          newStatus: "EMPTY_AT_WAREHOUSE",
          previousLocationId: line.cylinder.currentLocationId,
          newLocationId: destinationLocationId,
          changedById: userId,
          reason: `Empty return transfer ${movement.reference} received at warehouse`
        }
      });
    }
    const planned = movement.dispatchedQuantity ?? movement.requestedQuantity;
    const variance = planned - receivedLines.length;
    const saved = await tx.inventoryMovement.update({
      where: { id: movement.id },
      data: {
        status: variance === 0 ? "COMPLETED" : "VARIANCE_LOGGED",
        receivedQuantity: receivedLines.length,
        varianceQuantity: variance,
        varianceReason: variance ? input.remarks ?? "Some returned empties were not received." : null,
        receivingOfficerName: input.receivingOfficerName?.trim() || movement.receivingOfficerName || undefined,
        receivedById: userId,
        receivedAt: new Date(),
        completedAt: variance === 0 ? new Date() : null
      }
    });
    await tx.inventoryMovementHistory.create({
      data: {
        movementId: movement.id,
        fromStatus: movement.status,
        toStatus: saved.status,
        action: "Empty return warehouse receipt",
        details: `Received ${receivedLines.length} of ${planned} returned empty cylinder(s) at ${destinationLocationName}.`,
        changedById: userId
      }
    });
    return saved;
  });
}

export function reverseLogisticsErrorMessage(message: string) {
  const messages: Record<string, string> = {
    RETURN_CUSTOMER_NOT_FOUND: "Customer was not found for this empty return.",
    RETURN_CUSTODY_DIFFERENT_CUSTOMER: "This cylinder is currently assigned to a different customer.",
    RETURN_SKU_NOT_FOUND: "Could not match the returned cylinder size to an active SKU.",
    RETURN_WAREHOUSE_NOT_ALLOWED: "Select Wandiege, Ugunja, Lake Gas, or Oilcom as the receiving warehouse.",
    ONLY_EMPTY_SELLING_POINT_RETURNS_CAN_DISPATCH: "Only active, good-condition empty cylinders currently at this selling point can be dispatched back to warehouse.",
    RETURN_TRANSFER_NOT_FOUND: "Empty return transfer not found.",
    RETURN_TRANSFER_NOT_RECEIVABLE: "Only dispatched empty return transfers can be received.",
    RETURN_WAREHOUSE_REQUIRED: "This empty return transfer is missing a warehouse destination.",
    RETURN_TRANSFER_NO_MATCHING_SCANS: "None of the scanned cylinders match this empty return transfer."
  };
  return messages[message] ?? null;
}

export function buildReverseLogisticsSearchWhere(query?: string | null, status?: string | null): Prisma.InventoryMovementWhereInput {
  const q = query?.trim();
  return {
    type: "RETURN_FROM_VEHICLE",
    sourceStatus: "EMPTY_AT_SELLING_POINT",
    destinationStatus: "EMPTY_AT_WAREHOUSE",
    ...(status ? { status: status as never } : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q, mode: "insensitive" } },
            { sourceLocation: { name: { contains: q, mode: "insensitive" } } },
            { destinationLocation: { name: { contains: q, mode: "insensitive" } } },
            { cylinders: { some: { cylinder: { barcode: { contains: q, mode: "insensitive" } } } } },
            { cylinders: { some: { cylinder: { serialNumber: { contains: q, mode: "insensitive" } } } } }
          ]
        }
      : {})
  };
}
