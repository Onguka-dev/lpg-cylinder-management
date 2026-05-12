import type { CylinderStatus, Prisma, PrismaClient } from "@prisma/client";
import {
  getDispatchableSourceStatuses,
  getSellingPointRouteForLocationCode,
  isWarehouseDestination,
  normalizeCodeList,
  sellingPointDestinationCodes,
  sellingPointSourceCodes,
  sellingPointSourceCode,
  sourceCanDispatchToDestination,
  type SellingPointDispatchInput
} from "@/lib/selling-point-distribution";

type Db = PrismaClient;

export async function getSellingPointLocations(
  db: Pick<Db, "masterDataRecord">,
  options?: { preferredRegion?: string | null }
) {
  const locations = await db.masterDataRecord.findMany({
    where: {
      code: { in: [...sellingPointSourceCodes, ...sellingPointDestinationCodes] },
      type: { in: ["WAREHOUSE", "RETAIL_OUTLET", "VEHICLE"] },
      isActive: true
    },
    orderBy: [{ type: "asc" }, { name: "asc" }]
  });
  const sources = locations.filter((location) => sellingPointSourceCodes.includes(location.code as never));
  const destinations = locations.filter((location) => sellingPointDestinationCodes.includes(location.code as never));
  const source = sources.find((location) => location.code === sellingPointSourceCode);
  if (!source || !sources.length) throw new Error("SELLING_POINT_SOURCE_MISSING");

  const preferredRegion = options?.preferredRegion?.trim().toLowerCase();
  const regionSources = preferredRegion
    ? sources.filter((location) => getLocationRegion(location)?.toLowerCase() === preferredRegion)
    : sources;
  const regionDestinations = preferredRegion
    ? destinations.filter((location) => getLocationRegion(location)?.toLowerCase() === preferredRegion)
    : destinations;

  return {
    source,
    sources: regionSources.length ? regionSources : sources,
    destinations: regionDestinations.length ? regionDestinations : destinations
  };
}

export async function createSellingPointDispatch(
  db: Db,
  input: SellingPointDispatchInput,
  userId?: string | null,
  userRole?: string | null
) {
  const { source: defaultSource, sources, destinations } = await getSellingPointLocations(db);
  const source = input.sourceLocationId
    ? sources.find((location) => location.id === input.sourceLocationId)
    : defaultSource;
  if (!source) throw new Error("SELLING_POINT_SOURCE_NOT_ALLOWED");
  const destination = destinations.find((location) => location.id === input.destinationLocationId);
  if (!destination) throw new Error("SELLING_POINT_DESTINATION_NOT_ALLOWED");
  if (!sourceCanDispatchToDestination(source.code, destination.code)) {
    throw new Error("SELLING_POINT_CROSS_REGION_REQUIRES_TRANSFER");
  }

  const codes = normalizeCodeList(input.cylinderCodes);
  const allowedStatuses = [...getDispatchableSourceStatuses(source.code, input.adminOverride, userRole)] as CylinderStatus[];
  const cylinders = await db.cylinder.findMany({
    where: {
      currentLocationId: source.id,
      status: { in: allowedStatuses },
      activeStatus: true,
      unsafeStatus: false,
      quarantinedStatus: false,
      maintenanceStatus: { notIn: ["OPEN", "IN_PROGRESS"] },
      OR: [
        { serialNumber: { in: codes } },
        { barcode: { in: codes } },
        { factorySerialNo: { in: codes } },
        { qrCode: { in: codes } }
      ]
    },
    include: { sku: true },
    orderBy: { serialNumber: "asc" }
  });

  if (cylinders.length !== codes.length) {
    throw new Error(
      input.adminOverride && userRole === "ADMIN"
        ? `Only active, unblocked filled cylinders at ${source.name} can be dispatched.`
        : `Only ${allowedStatuses.join(" or ")} cylinders currently at ${source.name} can be dispatched.`
    );
  }

  return db.$transaction(async (tx) => {
    const grouped = new Map<string, typeof cylinders>();
    for (const cylinder of cylinders) {
      grouped.set(cylinder.skuId, [...(grouped.get(cylinder.skuId) ?? []), cylinder]);
    }

    const movements = [];
    for (const [skuId, group] of Array.from(grouped.entries())) {
      const sku = group[0].sku;
      const movement = await tx.inventoryMovement.create({
        data: {
          reference: `${input.reference.trim().toUpperCase()}-${sku.code}`,
          type: "TRANSFER",
          status: "DISPATCHED",
          skuId,
          sourceLocationId: source.id,
          destinationLocationId: destination.id,
          sourceStatus: "FILLED_AT_WAREHOUSE",
          destinationStatus: isWarehouseDestination(destination.code) ? "FILLED_AT_WAREHOUSE" : "FILLED_AT_SELLING_POINT",
          requestedQuantity: group.length,
          approvedQuantity: group.length,
          dispatchedQuantity: group.length,
          varianceQuantity: 0,
          notes: input.remarks?.trim() || `Dispatch from ${source.name} to ${destination.name}.`,
          vehicle: input.vehicle.trim(),
          driverSalesRep: input.driverSalesRep.trim(),
          route: input.route.trim(),
          dispatchOfficerName: input.dispatchOfficerName.trim(),
          receivingOfficerName: input.receivingOfficerName.trim(),
          transferDateTime: new Date(input.transferDateTime),
          expectedReceiptAt: input.expectedReceiptAt ? new Date(input.expectedReceiptAt) : null,
          requestedById: userId,
          approvedById: userId,
          dispatchedById: userId,
          approvedAt: new Date(),
          dispatchedAt: new Date()
        }
      });

      await tx.inventoryMovementHistory.create({
        data: {
          movementId: movement.id,
          toStatus: "DISPATCHED",
          action: "Selling point dispatch",
          details: `Dispatched ${group.length} filled ${sku.name} cylinder(s) from ${source.name} to ${destination.name}.`,
          changedById: userId
        }
      });

      for (const cylinder of group) {
        await tx.inventoryMovementCylinder.create({ data: { movementId: movement.id, cylinderId: cylinder.id } });
        await tx.cylinder.update({ where: { id: cylinder.id }, data: { status: "IN_TRANSIT" } });
        await tx.cylinderHistory.create({
          data: {
            cylinderId: cylinder.id,
            previousStatus: cylinder.status,
            newStatus: "IN_TRANSIT",
            previousLocationId: source.id,
            newLocationId: source.id,
            changedById: userId,
            reason: `Selling point dispatch ${movement.reference}`
          }
        });
      }

      movements.push(movement);
    }

    return movements;
  });
}

export async function receiveSellingPointDispatch(
  db: Db,
  movementId: string,
  input: { receivedCodes: string[]; receivingOfficerName?: string | null; remarks?: string | null },
  userId?: string | null
) {
  const movement = await db.inventoryMovement.findUnique({
    where: { id: movementId },
    include: {
      cylinders: { include: { cylinder: true }, orderBy: { createdAt: "asc" } },
      destinationLocation: true,
      sourceLocation: true
    }
  });
  if (!movement) throw new Error("SELLING_POINT_DISPATCH_NOT_FOUND");
  if (movement.status !== "DISPATCHED") throw new Error("SELLING_POINT_DISPATCH_NOT_RECEIVABLE");
  if (!movement.destinationLocationId || !movement.destinationLocation) throw new Error("SELLING_POINT_DESTINATION_REQUIRED");
  const destinationLocationId = movement.destinationLocationId;
  const destinationName = movement.destinationLocation.name;

  const receivedCodes = new Set(normalizeCodeList(input.receivedCodes));
  const receivedLines = movement.cylinders.filter((line) => {
    const codes = [line.cylinder.serialNumber, line.cylinder.barcode, line.cylinder.factorySerialNo, line.cylinder.qrCode]
      .filter(Boolean)
      .map((code) => String(code).toUpperCase());
    return codes.some((code) => receivedCodes.has(code));
  });

  if (!receivedLines.length) throw new Error("SELLING_POINT_NO_MATCHING_SCANS");

  return db.$transaction(async (tx) => {
    for (const line of receivedLines) {
      await tx.cylinder.update({
        where: { id: line.cylinderId },
        data: {
          status: movement.destinationStatus,
          currentLocationId: destinationLocationId
        }
      });
      await tx.cylinderHistory.create({
        data: {
          cylinderId: line.cylinderId,
          previousStatus: line.cylinder.status,
          newStatus: movement.destinationStatus,
          previousLocationId: line.cylinder.currentLocationId,
          newLocationId: destinationLocationId,
          changedById: userId,
          reason: `Selling point dispatch ${movement.reference} received`
        }
      });
    }

    const planned = movement.dispatchedQuantity ?? movement.requestedQuantity;
    const variance = planned - receivedLines.length;
    const status = variance === 0 ? "COMPLETED" : "VARIANCE_LOGGED";
    const saved = await tx.inventoryMovement.update({
      where: { id: movement.id },
      data: {
        status,
        receivedQuantity: receivedLines.length,
        varianceQuantity: variance,
        varianceReason: variance === 0 ? null : input.remarks ?? "Some dispatched cylinders were not received.",
        receivingOfficerName: input.receivingOfficerName?.trim() || movement.receivingOfficerName,
        receivedById: userId,
        receivedAt: new Date(),
        completedAt: status === "COMPLETED" ? new Date() : null
      }
    });

    await tx.inventoryMovementHistory.create({
      data: {
        movementId: movement.id,
        fromStatus: movement.status,
        toStatus: saved.status,
        action: "Selling point receipt",
        details: `Received ${receivedLines.length} of ${planned} cylinder(s) at ${destinationName}.`,
        changedById: userId
      }
    });

    return saved;
  });
}

export function sellingPointActionErrorMessage(message: string) {
  const messages: Record<string, string> = {
    SELLING_POINT_SOURCE_MISSING: "Selling point source warehouses are missing from master data.",
    SELLING_POINT_SOURCE_NOT_ALLOWED: "Select an allowed selling point source warehouse.",
    SELLING_POINT_DESTINATION_NOT_ALLOWED: "Select an allowed selling point destination.",
    SELLING_POINT_CROSS_REGION_REQUIRES_TRANSFER: "This source cannot dispatch directly to that destination. Transfer stock to the correct regional warehouse first, or use an authorized cross-region movement.",
    SELLING_POINT_DISPATCH_NOT_FOUND: "Dispatch not found.",
    SELLING_POINT_DISPATCH_NOT_RECEIVABLE: "Only dispatched selling point transfers can be received.",
    SELLING_POINT_DESTINATION_REQUIRED: "This dispatch is missing a destination.",
    SELLING_POINT_NO_MATCHING_SCANS: "None of the scanned cylinders match this dispatch."
  };

  return messages[message] ?? (message.startsWith("Only ") ? message : null);
}

export function buildSellingPointSearchWhere(query?: string | null, status?: string | null, region?: string | null): Prisma.InventoryMovementWhereInput {
  const q = query?.trim();
  const route = getRouteFilter(region);
  return {
    type: "TRANSFER",
    sourceLocation: {
      code: {
        in: route?.sourceCodes ? [...route.sourceCodes] : [...sellingPointSourceCodes]
      }
    },
    destinationLocation: {
      code: {
        in: route?.destinationCodes ? [...route.destinationCodes] : [...sellingPointDestinationCodes]
      }
    },
    ...(status ? { status: status as never } : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q, mode: "insensitive" } },
            { sourceLocation: { name: { contains: q, mode: "insensitive" } } },
            { destinationLocation: { name: { contains: q, mode: "insensitive" } } },
            { cylinders: { some: { cylinder: { barcode: { contains: q, mode: "insensitive" } } } } },
            { cylinders: { some: { cylinder: { serialNumber: { contains: q, mode: "insensitive" } } } } },
            { cylinders: { some: { cylinder: { factorySerialNo: { contains: q, mode: "insensitive" } } } } }
          ]
        }
      : {})
  };
}

export function buildSellingPointStockWhere(region?: string | null): Prisma.CylinderWhereInput {
  const route = getRouteFilter(region);
  return {
    currentLocation: {
      code: {
        in: route?.destinationCodes ? [...route.destinationCodes] : [...sellingPointDestinationCodes]
      }
    },
    status: { in: ["FILLED", "FILLED_AT_SELLING_POINT", "FILLED_AT_WAREHOUSE", "EMPTY"] }
  };
}

export function getLocationRegion(location: { metadata?: Prisma.JsonValue | null }) {
  const metadata = location.metadata;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata) && "region" in metadata) {
    const value = metadata.region;
    return typeof value === "string" ? value : null;
  }
  return null;
}

function getRouteFilter(value?: string | null) {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "NAIROBI") return getSellingPointRouteForLocationCode("SC-DAGORETTI");
  if (normalized === "WESTERN" || normalized === "WESTERN KENYA") return getSellingPointRouteForLocationCode(sellingPointSourceCode);
  return null;
}
