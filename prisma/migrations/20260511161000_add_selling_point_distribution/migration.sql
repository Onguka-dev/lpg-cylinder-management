ALTER TYPE "CylinderStatus" ADD VALUE IF NOT EXISTS 'FILLED_AT_SELLING_POINT';

ALTER TABLE "InventoryMovement"
  ADD COLUMN IF NOT EXISTS "vehicle" TEXT,
  ADD COLUMN IF NOT EXISTS "driverSalesRep" TEXT,
  ADD COLUMN IF NOT EXISTS "route" TEXT,
  ADD COLUMN IF NOT EXISTS "dispatchOfficerName" TEXT,
  ADD COLUMN IF NOT EXISTS "receivingOfficerName" TEXT,
  ADD COLUMN IF NOT EXISTS "transferDateTime" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "expectedReceiptAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "InventoryMovement_transferDateTime_idx" ON "InventoryMovement"("transferDateTime");
CREATE INDEX IF NOT EXISTS "InventoryMovement_expectedReceiptAt_idx" ON "InventoryMovement"("expectedReceiptAt");
