ALTER TYPE "CylinderStatus" ADD VALUE IF NOT EXISTS 'EMPTY_IN_TRANSIT';
ALTER TYPE "CylinderStatus" ADD VALUE IF NOT EXISTS 'FILLED_IN_TRANSIT';
ALTER TYPE "CylinderStatus" ADD VALUE IF NOT EXISTS 'FILLED_AT_WAREHOUSE';

CREATE TYPE "PlantTransferStatus" AS ENUM (
  'DRAFT',
  'DISPATCHED_TO_PLANT',
  'RECEIVED_AT_PLANT',
  'VARIANCE_LOGGED',
  'REFILLED',
  'RETURN_DISPATCHED',
  'COMPLETED'
);

CREATE TYPE "PlantTransferLineStatus" AS ENUM (
  'EXPECTED',
  'RECEIVED_AT_PLANT',
  'MISSING',
  'EXTRA',
  'DAMAGED',
  'REFILLED',
  'RETURNED_TO_WAREHOUSE'
);

CREATE TYPE "RefillBatchStatus" AS ENUM ('DRAFT', 'QUALITY_CHECKED', 'FILLED');
CREATE TYPE "QualityInspectionStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED');
CREATE TYPE "PlantVarianceType" AS ENUM ('MISSING', 'EXTRA', 'DAMAGED');
CREATE TYPE "PlantVarianceStatus" AS ENUM ('OPEN', 'RESOLVED');

CREATE TABLE "PlantTransfer" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "status" "PlantTransferStatus" NOT NULL DEFAULT 'DRAFT',
  "sourceLocationId" TEXT NOT NULL,
  "plantLocationId" TEXT NOT NULL,
  "returnDestinationId" TEXT NOT NULL,
  "vehicle" TEXT NOT NULL,
  "driver" TEXT NOT NULL,
  "sealNumber" TEXT NOT NULL,
  "dispatchNote" TEXT,
  "expectedReceiptTime" TIMESTAMP(3),
  "remarks" TEXT,
  "dispatchMovementId" TEXT,
  "returnMovementId" TEXT,
  "createdById" TEXT,
  "dispatchedById" TEXT,
  "plantReceivedById" TEXT,
  "returnDispatchedById" TEXT,
  "returnReceivedById" TEXT,
  "dispatchedAt" TIMESTAMP(3),
  "plantReceivedAt" TIMESTAMP(3),
  "returnDispatchedAt" TIMESTAMP(3),
  "returnReceivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlantTransfer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlantTransferLine" (
  "id" TEXT NOT NULL,
  "transferId" TEXT NOT NULL,
  "cylinderId" TEXT NOT NULL,
  "status" "PlantTransferLineStatus" NOT NULL DEFAULT 'EXPECTED',
  "receivedAt" TIMESTAMP(3),
  "returnReceivedAt" TIMESTAMP(3),
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlantTransferLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RefillBatch" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "transferId" TEXT NOT NULL,
  "plantLocationId" TEXT NOT NULL,
  "status" "RefillBatchStatus" NOT NULL DEFAULT 'DRAFT',
  "qualityInspectionStatus" "QualityInspectionStatus" NOT NULL DEFAULT 'PENDING',
  "qualityNotes" TEXT,
  "createdById" TEXT,
  "qualityCheckedById" TEXT,
  "qualityCheckedAt" TIMESTAMP(3),
  "filledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RefillBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RefillBatchLine" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "transferLineId" TEXT NOT NULL,
  "cylinderId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RefillBatchLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlantVarianceCase" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "transferId" TEXT NOT NULL,
  "transferLineId" TEXT,
  "cylinderId" TEXT,
  "type" "PlantVarianceType" NOT NULL,
  "status" "PlantVarianceStatus" NOT NULL DEFAULT 'OPEN',
  "details" TEXT NOT NULL,
  "createdById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlantVarianceCase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlantTransfer_reference_key" ON "PlantTransfer"("reference");
CREATE INDEX "PlantTransfer_status_idx" ON "PlantTransfer"("status");
CREATE INDEX "PlantTransfer_sourceLocationId_idx" ON "PlantTransfer"("sourceLocationId");
CREATE INDEX "PlantTransfer_plantLocationId_idx" ON "PlantTransfer"("plantLocationId");
CREATE INDEX "PlantTransfer_returnDestinationId_idx" ON "PlantTransfer"("returnDestinationId");
CREATE INDEX "PlantTransfer_dispatchMovementId_idx" ON "PlantTransfer"("dispatchMovementId");
CREATE INDEX "PlantTransfer_createdAt_idx" ON "PlantTransfer"("createdAt");

CREATE UNIQUE INDEX "PlantTransferLine_transferId_cylinderId_key" ON "PlantTransferLine"("transferId", "cylinderId");
CREATE INDEX "PlantTransferLine_cylinderId_idx" ON "PlantTransferLine"("cylinderId");
CREATE INDEX "PlantTransferLine_status_idx" ON "PlantTransferLine"("status");

CREATE UNIQUE INDEX "RefillBatch_reference_key" ON "RefillBatch"("reference");
CREATE INDEX "RefillBatch_transferId_idx" ON "RefillBatch"("transferId");
CREATE INDEX "RefillBatch_plantLocationId_idx" ON "RefillBatch"("plantLocationId");
CREATE INDEX "RefillBatch_status_idx" ON "RefillBatch"("status");
CREATE INDEX "RefillBatch_qualityInspectionStatus_idx" ON "RefillBatch"("qualityInspectionStatus");

CREATE UNIQUE INDEX "RefillBatchLine_batchId_cylinderId_key" ON "RefillBatchLine"("batchId", "cylinderId");
CREATE UNIQUE INDEX "RefillBatchLine_transferLineId_key" ON "RefillBatchLine"("transferLineId");
CREATE INDEX "RefillBatchLine_cylinderId_idx" ON "RefillBatchLine"("cylinderId");

CREATE UNIQUE INDEX "PlantVarianceCase_reference_key" ON "PlantVarianceCase"("reference");
CREATE INDEX "PlantVarianceCase_transferId_idx" ON "PlantVarianceCase"("transferId");
CREATE INDEX "PlantVarianceCase_transferLineId_idx" ON "PlantVarianceCase"("transferLineId");
CREATE INDEX "PlantVarianceCase_cylinderId_idx" ON "PlantVarianceCase"("cylinderId");
CREATE INDEX "PlantVarianceCase_type_idx" ON "PlantVarianceCase"("type");
CREATE INDEX "PlantVarianceCase_status_idx" ON "PlantVarianceCase"("status");

ALTER TABLE "PlantTransfer" ADD CONSTRAINT "PlantTransfer_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES "MasterDataRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlantTransfer" ADD CONSTRAINT "PlantTransfer_plantLocationId_fkey" FOREIGN KEY ("plantLocationId") REFERENCES "MasterDataRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlantTransfer" ADD CONSTRAINT "PlantTransfer_returnDestinationId_fkey" FOREIGN KEY ("returnDestinationId") REFERENCES "MasterDataRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlantTransfer" ADD CONSTRAINT "PlantTransfer_dispatchMovementId_fkey" FOREIGN KEY ("dispatchMovementId") REFERENCES "InventoryMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlantTransfer" ADD CONSTRAINT "PlantTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlantTransfer" ADD CONSTRAINT "PlantTransfer_dispatchedById_fkey" FOREIGN KEY ("dispatchedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlantTransfer" ADD CONSTRAINT "PlantTransfer_plantReceivedById_fkey" FOREIGN KEY ("plantReceivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlantTransfer" ADD CONSTRAINT "PlantTransfer_returnDispatchedById_fkey" FOREIGN KEY ("returnDispatchedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlantTransfer" ADD CONSTRAINT "PlantTransfer_returnReceivedById_fkey" FOREIGN KEY ("returnReceivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlantTransferLine" ADD CONSTRAINT "PlantTransferLine_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "PlantTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlantTransferLine" ADD CONSTRAINT "PlantTransferLine_cylinderId_fkey" FOREIGN KEY ("cylinderId") REFERENCES "Cylinder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RefillBatch" ADD CONSTRAINT "RefillBatch_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "PlantTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefillBatch" ADD CONSTRAINT "RefillBatch_plantLocationId_fkey" FOREIGN KEY ("plantLocationId") REFERENCES "MasterDataRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefillBatch" ADD CONSTRAINT "RefillBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RefillBatch" ADD CONSTRAINT "RefillBatch_qualityCheckedById_fkey" FOREIGN KEY ("qualityCheckedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RefillBatchLine" ADD CONSTRAINT "RefillBatchLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "RefillBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefillBatchLine" ADD CONSTRAINT "RefillBatchLine_transferLineId_fkey" FOREIGN KEY ("transferLineId") REFERENCES "PlantTransferLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefillBatchLine" ADD CONSTRAINT "RefillBatchLine_cylinderId_fkey" FOREIGN KEY ("cylinderId") REFERENCES "Cylinder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlantVarianceCase" ADD CONSTRAINT "PlantVarianceCase_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "PlantTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlantVarianceCase" ADD CONSTRAINT "PlantVarianceCase_transferLineId_fkey" FOREIGN KEY ("transferLineId") REFERENCES "PlantTransferLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlantVarianceCase" ADD CONSTRAINT "PlantVarianceCase_cylinderId_fkey" FOREIGN KEY ("cylinderId") REFERENCES "Cylinder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlantVarianceCase" ADD CONSTRAINT "PlantVarianceCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
