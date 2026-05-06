CREATE TYPE "ReconciliationScope" AS ENUM ('RSO', 'MSO', 'WAREHOUSE');
CREATE TYPE "ReconciliationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'RETURNED');

CREATE TABLE "DailyReconciliation" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "reconciliationDate" TIMESTAMP(3) NOT NULL,
  "scope" "ReconciliationScope" NOT NULL,
  "status" "ReconciliationStatus" NOT NULL DEFAULT 'DRAFT',
  "ownerId" TEXT NOT NULL,
  "locationId" TEXT,
  "openingStock" INTEGER NOT NULL DEFAULT 0,
  "goodsReceived" INTEGER NOT NULL DEFAULT 0,
  "salesIssues" INTEGER NOT NULL DEFAULT 0,
  "transfers" INTEGER NOT NULL DEFAULT 0,
  "returns" INTEGER NOT NULL DEFAULT 0,
  "damagedCylinders" INTEGER NOT NULL DEFAULT 0,
  "expectedClosingStock" INTEGER NOT NULL DEFAULT 0,
  "actualClosingStock" INTEGER NOT NULL DEFAULT 0,
  "stockVariance" INTEGER NOT NULL DEFAULT 0,
  "stockExplanation" TEXT,
  "cashCollections" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "mpesaCollections" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "cardCollections" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "expectedCash" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "actualCash" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "paymentVariance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "paymentExplanation" TEXT,
  "supervisorNotes" TEXT,
  "adminOverrideReason" TEXT,
  "createdById" TEXT,
  "reviewedById" TEXT,
  "submittedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "returnedAt" TIMESTAMP(3),
  "lockedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DailyReconciliation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyReconciliation_reference_key" ON "DailyReconciliation"("reference");
CREATE UNIQUE INDEX "DailyReconciliation_ownerId_reconciliationDate_scope_key" ON "DailyReconciliation"("ownerId", "reconciliationDate", "scope");
CREATE INDEX "DailyReconciliation_status_idx" ON "DailyReconciliation"("status");
CREATE INDEX "DailyReconciliation_scope_idx" ON "DailyReconciliation"("scope");
CREATE INDEX "DailyReconciliation_reconciliationDate_idx" ON "DailyReconciliation"("reconciliationDate");
CREATE INDEX "DailyReconciliation_locationId_idx" ON "DailyReconciliation"("locationId");

ALTER TABLE "DailyReconciliation" ADD CONSTRAINT "DailyReconciliation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailyReconciliation" ADD CONSTRAINT "DailyReconciliation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "MasterDataRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DailyReconciliation" ADD CONSTRAINT "DailyReconciliation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DailyReconciliation" ADD CONSTRAINT "DailyReconciliation_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
