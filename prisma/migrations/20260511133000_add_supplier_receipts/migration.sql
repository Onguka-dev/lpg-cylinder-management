CREATE TYPE "SupplierReceiptStatus" AS ENUM ('DRAFT', 'REVIEWED', 'POSTED');

CREATE TYPE "SupplierReceiptCondition" AS ENUM ('FILLED', 'EMPTY', 'DAMAGED', 'QUARANTINED');

CREATE TABLE "SupplierReceipt" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "supplierManufacturer" TEXT NOT NULL,
  "purchaseOrderReference" TEXT NOT NULL,
  "deliveryNote" TEXT,
  "vehicleTruckNumber" TEXT,
  "receiptDateTime" TIMESTAMP(3) NOT NULL,
  "receivedByName" TEXT NOT NULL,
  "remarks" TEXT,
  "attachmentPlaceholder" TEXT,
  "status" "SupplierReceiptStatus" NOT NULL DEFAULT 'DRAFT',
  "createdById" TEXT,
  "reviewedById" TEXT,
  "postedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "postedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SupplierReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierReceiptLine" (
  "id" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "cylinderSizeKg" INTEGER NOT NULL,
  "factorySerialNo" TEXT NOT NULL,
  "barcode" TEXT NOT NULL,
  "qrCode" TEXT,
  "manufacturer" TEXT NOT NULL,
  "manufactureDate" TIMESTAMP(3),
  "condition" "SupplierReceiptCondition" NOT NULL,
  "cylinderId" TEXT,
  "inventoryMovementId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SupplierReceiptLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupplierReceipt_reference_key" ON "SupplierReceipt"("reference");
CREATE INDEX "SupplierReceipt_warehouseId_idx" ON "SupplierReceipt"("warehouseId");
CREATE INDEX "SupplierReceipt_status_idx" ON "SupplierReceipt"("status");
CREATE INDEX "SupplierReceipt_receiptDateTime_idx" ON "SupplierReceipt"("receiptDateTime");
CREATE INDEX "SupplierReceipt_createdById_idx" ON "SupplierReceipt"("createdById");

CREATE UNIQUE INDEX "SupplierReceiptLine_factorySerialNo_key" ON "SupplierReceiptLine"("factorySerialNo");
CREATE UNIQUE INDEX "SupplierReceiptLine_barcode_key" ON "SupplierReceiptLine"("barcode");
CREATE INDEX "SupplierReceiptLine_receiptId_idx" ON "SupplierReceiptLine"("receiptId");
CREATE INDEX "SupplierReceiptLine_cylinderSizeKg_idx" ON "SupplierReceiptLine"("cylinderSizeKg");
CREATE INDEX "SupplierReceiptLine_condition_idx" ON "SupplierReceiptLine"("condition");
CREATE INDEX "SupplierReceiptLine_cylinderId_idx" ON "SupplierReceiptLine"("cylinderId");
CREATE INDEX "SupplierReceiptLine_inventoryMovementId_idx" ON "SupplierReceiptLine"("inventoryMovementId");

ALTER TABLE "SupplierReceipt"
  ADD CONSTRAINT "SupplierReceipt_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "MasterDataRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupplierReceipt"
  ADD CONSTRAINT "SupplierReceipt_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupplierReceipt"
  ADD CONSTRAINT "SupplierReceipt_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupplierReceipt"
  ADD CONSTRAINT "SupplierReceipt_postedById_fkey"
  FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupplierReceiptLine"
  ADD CONSTRAINT "SupplierReceiptLine_receiptId_fkey"
  FOREIGN KEY ("receiptId") REFERENCES "SupplierReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupplierReceiptLine"
  ADD CONSTRAINT "SupplierReceiptLine_cylinderId_fkey"
  FOREIGN KEY ("cylinderId") REFERENCES "Cylinder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupplierReceiptLine"
  ADD CONSTRAINT "SupplierReceiptLine_inventoryMovementId_fkey"
  FOREIGN KEY ("inventoryMovementId") REFERENCES "InventoryMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
