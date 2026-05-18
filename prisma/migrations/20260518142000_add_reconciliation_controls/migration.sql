-- Additive Prompt 14 reconciliation controls.

ALTER TYPE "ReconciliationStatus" ADD VALUE IF NOT EXISTS 'CLOSED';

CREATE TYPE "ReconciliationCountMode" AS ENUM ('SUMMARY', 'SCAN');

CREATE TYPE "ReconciliationVarianceType" AS ENUM (
  'MISSING',
  'EXTRA',
  'DUPLICATE',
  'WRONG_LOCATION',
  'WRONG_STATUS',
  'OVERDUE_IN_TRANSIT',
  'STOCK_VARIANCE',
  'PAYMENT_VARIANCE'
);

CREATE TYPE "ReconciliationVarianceStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED');

CREATE TABLE "ReconciliationCountLine" (
  "id" TEXT NOT NULL,
  "reconciliationId" TEXT NOT NULL,
  "skuId" TEXT NOT NULL,
  "status" "CylinderStatus" NOT NULL,
  "systemCount" INTEGER NOT NULL DEFAULT 0,
  "actualCount" INTEGER NOT NULL DEFAULT 0,
  "scannedCount" INTEGER,
  "variance" INTEGER NOT NULL DEFAULT 0,
  "countMode" "ReconciliationCountMode" NOT NULL DEFAULT 'SUMMARY',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReconciliationCountLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReconciliationVarianceCase" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "reconciliationId" TEXT NOT NULL,
  "type" "ReconciliationVarianceType" NOT NULL,
  "status" "ReconciliationVarianceStatus" NOT NULL DEFAULT 'OPEN',
  "cylinderId" TEXT,
  "movementId" TEXT,
  "skuId" TEXT,
  "locationId" TEXT,
  "expectedStatus" "CylinderStatus",
  "scannedStatus" "CylinderStatus",
  "expectedLocationId" TEXT,
  "scannedLocationId" TEXT,
  "expectedQuantity" INTEGER,
  "actualQuantity" INTEGER,
  "varianceQuantity" INTEGER,
  "details" TEXT NOT NULL,
  "resolutionNotes" TEXT,
  "createdById" TEXT,
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReconciliationVarianceCase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReconciliationCountLine_reconciliationId_skuId_status_key" ON "ReconciliationCountLine"("reconciliationId", "skuId", "status");
CREATE INDEX "ReconciliationCountLine_skuId_idx" ON "ReconciliationCountLine"("skuId");
CREATE INDEX "ReconciliationCountLine_status_idx" ON "ReconciliationCountLine"("status");

CREATE UNIQUE INDEX "ReconciliationVarianceCase_reference_key" ON "ReconciliationVarianceCase"("reference");
CREATE INDEX "ReconciliationVarianceCase_reconciliationId_idx" ON "ReconciliationVarianceCase"("reconciliationId");
CREATE INDEX "ReconciliationVarianceCase_type_idx" ON "ReconciliationVarianceCase"("type");
CREATE INDEX "ReconciliationVarianceCase_status_idx" ON "ReconciliationVarianceCase"("status");
CREATE INDEX "ReconciliationVarianceCase_cylinderId_idx" ON "ReconciliationVarianceCase"("cylinderId");
CREATE INDEX "ReconciliationVarianceCase_movementId_idx" ON "ReconciliationVarianceCase"("movementId");
CREATE INDEX "ReconciliationVarianceCase_skuId_idx" ON "ReconciliationVarianceCase"("skuId");
CREATE INDEX "ReconciliationVarianceCase_locationId_idx" ON "ReconciliationVarianceCase"("locationId");

ALTER TABLE "ReconciliationCountLine" ADD CONSTRAINT "ReconciliationCountLine_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "DailyReconciliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReconciliationCountLine" ADD CONSTRAINT "ReconciliationCountLine_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "MasterDataRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReconciliationVarianceCase" ADD CONSTRAINT "ReconciliationVarianceCase_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "DailyReconciliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReconciliationVarianceCase" ADD CONSTRAINT "ReconciliationVarianceCase_cylinderId_fkey" FOREIGN KEY ("cylinderId") REFERENCES "Cylinder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReconciliationVarianceCase" ADD CONSTRAINT "ReconciliationVarianceCase_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "InventoryMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReconciliationVarianceCase" ADD CONSTRAINT "ReconciliationVarianceCase_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "MasterDataRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReconciliationVarianceCase" ADD CONSTRAINT "ReconciliationVarianceCase_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "MasterDataRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReconciliationVarianceCase" ADD CONSTRAINT "ReconciliationVarianceCase_expectedLocationId_fkey" FOREIGN KEY ("expectedLocationId") REFERENCES "MasterDataRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReconciliationVarianceCase" ADD CONSTRAINT "ReconciliationVarianceCase_scannedLocationId_fkey" FOREIGN KEY ("scannedLocationId") REFERENCES "MasterDataRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReconciliationVarianceCase" ADD CONSTRAINT "ReconciliationVarianceCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReconciliationVarianceCase" ADD CONSTRAINT "ReconciliationVarianceCase_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
