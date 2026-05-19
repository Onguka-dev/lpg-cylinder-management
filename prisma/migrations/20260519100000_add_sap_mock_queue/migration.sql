-- Additive Prompt 15 SAP mock queue and placeholder mapping fields.

CREATE TYPE "SapPostingStatus" AS ENUM ('QUEUED', 'POSTED', 'FAILED', 'RETRY_QUEUED', 'MISMATCHED');

CREATE TYPE "SapSourceModule" AS ENUM (
  'SUPPLIER_RECEIPT',
  'INVENTORY_MOVEMENT',
  'FULL_CYLINDER_SALE',
  'REFILL_ORDER',
  'FIELD_SALE',
  'EMPTY_RETURN',
  'SCRAP_WRITE_OFF'
);

ALTER TABLE "Customer" ADD COLUMN "sapCustomerCode" TEXT;

ALTER TABLE "MasterDataRecord" ADD COLUMN "sapMaterialCode" TEXT;
ALTER TABLE "MasterDataRecord" ADD COLUMN "sapPlantCode" TEXT;
ALTER TABLE "MasterDataRecord" ADD COLUMN "sapStorageLocationCode" TEXT;

ALTER TABLE "SupplierReceipt" ADD COLUMN "sapDocumentNo" TEXT;
ALTER TABLE "InventoryMovement" ADD COLUMN "sapDocumentNo" TEXT;
ALTER TABLE "FullCylinderSale" ADD COLUMN "sapDocumentNo" TEXT;
ALTER TABLE "RefillOrder" ADD COLUMN "sapDocumentNo" TEXT;
ALTER TABLE "FieldSale" ADD COLUMN "sapDocumentNo" TEXT;

CREATE TABLE "SapPostingQueue" (
  "id" TEXT NOT NULL,
  "sourceModule" "SapSourceModule" NOT NULL,
  "sourceRecordId" TEXT NOT NULL,
  "sourceReference" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "status" "SapPostingStatus" NOT NULL DEFAULT 'QUEUED',
  "sapDocumentNo" TEXT,
  "sapCustomerCode" TEXT,
  "sapMaterialCode" TEXT,
  "sapPlantCode" TEXT,
  "sapStorageLocationCode" TEXT,
  "amount" DECIMAL(12,2),
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "payload" JSONB NOT NULL,
  "responsePayload" JSONB,
  "mismatchReason" TEXT,
  "errorMessage" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "integrationLogId" TEXT,
  "createdById" TEXT,
  "postedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SapPostingQueue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SapPostingQueue_sourceModule_sourceRecordId_key" ON "SapPostingQueue"("sourceModule", "sourceRecordId");
CREATE INDEX "SapPostingQueue_sourceModule_idx" ON "SapPostingQueue"("sourceModule");
CREATE INDEX "SapPostingQueue_status_idx" ON "SapPostingQueue"("status");
CREATE INDEX "SapPostingQueue_sapDocumentNo_idx" ON "SapPostingQueue"("sapDocumentNo");
CREATE INDEX "SapPostingQueue_integrationLogId_idx" ON "SapPostingQueue"("integrationLogId");
CREATE INDEX "SapPostingQueue_createdAt_idx" ON "SapPostingQueue"("createdAt");

ALTER TABLE "SapPostingQueue" ADD CONSTRAINT "SapPostingQueue_integrationLogId_fkey" FOREIGN KEY ("integrationLogId") REFERENCES "IntegrationLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SapPostingQueue" ADD CONSTRAINT "SapPostingQueue_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
