import type { Prisma, PrismaClient } from "@prisma/client";
import { defaultCylinderBlockedReason } from "@/lib/inventory";
import { conditionToCylinderStatus } from "@/lib/supplier-receipts";

type SupplierReceiptPostingClient = Pick<
  PrismaClient,
  | "supplierReceipt"
  | "supplierReceiptLine"
  | "masterDataRecord"
  | "cylinder"
  | "cylinderHistory"
  | "inventoryMovement"
  | "inventoryMovementCylinder"
  | "inventoryMovementHistory"
>;

export async function assertSupplierReceiptNoStoredDuplicates(
  db: Pick<PrismaClient, "cylinder" | "supplierReceiptLine">,
  lines: Array<{ factorySerialNo: string; barcode: string; qrCode?: string | null }>,
  excludeReceiptId?: string
) {
  const serials = lines.map((line) => line.factorySerialNo);
  const barcodes = lines.map((line) => line.barcode);
  const qrCodes = lines.map((line) => line.qrCode).filter(Boolean) as string[];

  const existingCylinder = await db.cylinder.findFirst({
    where: {
      OR: [
        { serialNumber: { in: serials } },
        { factorySerialNo: { in: serials } },
        { barcode: { in: barcodes } },
        ...(qrCodes.length ? [{ qrCode: { in: qrCodes } }] : [])
      ]
    },
    select: { serialNumber: true, factorySerialNo: true, barcode: true, qrCode: true }
  });

  if (existingCylinder) {
    throw new Error(`Duplicate cylinder record already exists for serial/barcode ${existingCylinder.factorySerialNo ?? existingCylinder.serialNumber ?? existingCylinder.barcode ?? existingCylinder.qrCode}.`);
  }

  const existingLine = await db.supplierReceiptLine.findFirst({
    where: {
      OR: [
        { factorySerialNo: { in: serials } },
        { barcode: { in: barcodes } }
      ],
      receiptId: excludeReceiptId ? { not: excludeReceiptId } : undefined
    },
    select: { factorySerialNo: true, barcode: true }
  });

  if (existingLine) {
    throw new Error(`Duplicate supplier receipt line already exists for ${existingLine.factorySerialNo || existingLine.barcode}.`);
  }
}

export async function postSupplierReceipt(
  db: SupplierReceiptPostingClient,
  receiptId: string,
  userId?: string | null
) {
  const receipt = await db.supplierReceipt.findUnique({
    where: { id: receiptId },
    include: { lines: true, warehouse: true }
  });

  if (!receipt) throw new Error("SUPPLIER_RECEIPT_NOT_FOUND");
  if (receipt.status === "POSTED") throw new Error("SUPPLIER_RECEIPT_ALREADY_POSTED");
  if (!receipt.lines.length) throw new Error("SUPPLIER_RECEIPT_LINES_REQUIRED");

  await assertSupplierReceiptNoStoredDuplicates(db, receipt.lines, receipt.id);

  const sizes = Array.from(new Set(receipt.lines.map((line) => line.cylinderSizeKg)));
  const skus = await db.masterDataRecord.findMany({
    where: { type: "SKU_MASTER", capacityKg: { in: sizes }, isActive: true }
  });
  const skuBySize = new Map(skus.map((sku) => [sku.capacityKg, sku]));

  for (const size of sizes) {
    if (!skuBySize.get(size)) {
      throw new Error(`No active SKU found for ${size}kg cylinders.`);
    }
  }

  const movementByGroup = new Map<string, { id: string }>();

  for (const line of receipt.lines) {
    const status = conditionToCylinderStatus(line.condition);
    const sku = skuBySize.get(line.cylinderSizeKg);
    if (!sku) throw new Error(`No active SKU found for ${line.cylinderSizeKg}kg cylinders.`);
    const groupKey = `${line.cylinderSizeKg}-${status}`;
    let movement = movementByGroup.get(groupKey);

    if (!movement) {
      const quantity = receipt.lines.filter((candidate) => (
        candidate.cylinderSizeKg === line.cylinderSizeKg &&
        conditionToCylinderStatus(candidate.condition) === status
      )).length;

      movement = await db.inventoryMovement.create({
        data: {
          reference: `${receipt.reference}-${line.cylinderSizeKg}KG-${status}`,
          type: "RECEIPT",
          status: "COMPLETED",
          skuId: sku.id,
          destinationLocationId: receipt.warehouseId,
          destinationStatus: status,
          requestedQuantity: quantity,
          approvedQuantity: quantity,
          dispatchedQuantity: quantity,
          receivedQuantity: quantity,
          requestedById: receipt.createdById,
          approvedById: userId ?? receipt.reviewedById,
          receivedById: userId ?? receipt.createdById,
          approvedAt: new Date(),
          receivedAt: receipt.receiptDateTime,
          completedAt: new Date(),
          notes: `Supplier receipt ${receipt.reference} from ${receipt.supplierManufacturer}.`
        }
      });

      await db.inventoryMovementHistory.create({
        data: {
          movementId: movement.id,
          toStatus: "COMPLETED",
          action: "Supplier receipt posted",
          details: `Posted ${quantity} purchased ${line.cylinderSizeKg}kg cylinder(s) to ${receipt.warehouse.name}.`,
          changedById: userId ?? receipt.createdById
        }
      });

      movementByGroup.set(groupKey, movement);
    }

    const blockedReason = defaultCylinderBlockedReason(status);
    const cylinder = await db.cylinder.create({
      data: {
        serialNumber: line.factorySerialNo,
        factorySerialNo: line.factorySerialNo,
        barcode: line.barcode,
        qrCode: line.qrCode,
        cylinderSizeKg: line.cylinderSizeKg,
        manufacturer: line.manufacturer,
        manufactureDate: line.manufactureDate,
        skuId: sku.id,
        currentLocationId: receipt.warehouseId,
        status,
        activeStatus: true,
        companyOwned: true,
        blockedReason,
        unsafeStatus: status === "DAMAGED" || status === "QUARANTINED",
        quarantinedStatus: status === "QUARANTINED",
        notes: `Received via supplier receipt ${receipt.reference}.`
      }
    });

    await db.inventoryMovementCylinder.create({
      data: {
        movementId: movement.id,
        cylinderId: cylinder.id
      }
    });

    await db.cylinderHistory.create({
      data: {
        cylinderId: cylinder.id,
        newStatus: status,
        newLocationId: receipt.warehouseId,
        changedById: userId ?? receipt.createdById,
        reason: `Supplier receipt ${receipt.reference} posted`
      }
    });

    await db.supplierReceiptLine.update({
      where: { id: line.id },
      data: {
        cylinderId: cylinder.id,
        inventoryMovementId: movement.id
      }
    });
  }

  return db.supplierReceipt.update({
    where: { id: receipt.id },
    data: {
      status: "POSTED",
      reviewedById: receipt.reviewedById ?? userId ?? null,
      reviewedAt: receipt.reviewedAt ?? new Date(),
      postedById: userId ?? null,
      postedAt: new Date()
    },
    include: { lines: true, warehouse: true }
  });
}

export function receiptSummaryMetadata(receipt: {
  reference: string;
  supplierManufacturer: string;
  status: string;
  lines: Array<{ cylinderSizeKg: number; condition: string }>;
}): Prisma.InputJsonValue {
  return {
    reference: receipt.reference,
    supplierManufacturer: receipt.supplierManufacturer,
    status: receipt.status,
    lineCount: receipt.lines.length,
    totals: receipt.lines.reduce<Record<string, number>>((totals, line) => {
      const key = `${line.cylinderSizeKg}kg ${line.condition}`;
      totals[key] = (totals[key] ?? 0) + 1;
      return totals;
    }, {})
  };
}
