-- CreateEnum
CREATE TYPE "OfflineSyncItemType" AS ENUM ('ASSIGNED_DELIVERY_SNAPSHOT', 'VEHICLE_STOCK_SNAPSHOT', 'CUSTOMER_DRAFT', 'DELIVERY_STATUS_DRAFT', 'PROOF_OF_DELIVERY_DRAFT', 'FIELD_SALE_DRAFT');

-- CreateEnum
CREATE TYPE "OfflineSyncItemStatus" AS ENUM ('QUEUED', 'SYNCED', 'FAILED', 'CONFLICT');

-- CreateTable
CREATE TABLE "OfflineSyncItem" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "OfflineSyncItemType" NOT NULL,
    "status" "OfflineSyncItemStatus" NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB NOT NULL,
    "serverRecordId" TEXT,
    "conflictReason" TEXT,
    "failedReason" TEXT,
    "createdById" TEXT,
    "clientCreatedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfflineSyncItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OfflineSyncItem_clientId_key" ON "OfflineSyncItem"("clientId");

-- CreateIndex
CREATE INDEX "OfflineSyncItem_type_idx" ON "OfflineSyncItem"("type");

-- CreateIndex
CREATE INDEX "OfflineSyncItem_status_idx" ON "OfflineSyncItem"("status");

-- CreateIndex
CREATE INDEX "OfflineSyncItem_createdById_idx" ON "OfflineSyncItem"("createdById");

-- CreateIndex
CREATE INDEX "OfflineSyncItem_createdAt_idx" ON "OfflineSyncItem"("createdAt");

-- AddForeignKey
ALTER TABLE "OfflineSyncItem" ADD CONSTRAINT "OfflineSyncItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
