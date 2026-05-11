CREATE TYPE "ScanActionType" AS ENUM (
  'RECEIPT',
  'TRANSFER_DISPATCH',
  'TRANSFER_RECEIVE',
  'SALE',
  'CUSTOMER_RETURN',
  'NON_CODED_INTAKE',
  'REPORT_LOOKUP',
  'MOBILE_VERIFY'
);

CREATE TYPE "ScanResultStatus" AS ENUM (
  'PERMITTED',
  'CYLINDER_NOT_FOUND',
  'WRONG_LOCATION',
  'WRONG_STATUS',
  'BLOCKED_DAMAGED',
  'ALREADY_SCANNED',
  'INACTIVE',
  'FAILED'
);

CREATE TABLE "ScanEvent" (
  "id" TEXT NOT NULL,
  "barcode" TEXT NOT NULL,
  "action" "ScanActionType" NOT NULL,
  "result" "ScanResultStatus" NOT NULL,
  "failureReason" TEXT,
  "batchId" TEXT,
  "expectedStatus" "CylinderStatus",
  "scannedStatus" "CylinderStatus",
  "expectedLocationId" TEXT,
  "scannedLocationId" TEXT,
  "cylinderId" TEXT,
  "userId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScanEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScanEvent_barcode_idx" ON "ScanEvent"("barcode");
CREATE INDEX "ScanEvent_action_idx" ON "ScanEvent"("action");
CREATE INDEX "ScanEvent_result_idx" ON "ScanEvent"("result");
CREATE INDEX "ScanEvent_batchId_idx" ON "ScanEvent"("batchId");
CREATE INDEX "ScanEvent_cylinderId_idx" ON "ScanEvent"("cylinderId");
CREATE INDEX "ScanEvent_userId_idx" ON "ScanEvent"("userId");
CREATE INDEX "ScanEvent_expectedLocationId_idx" ON "ScanEvent"("expectedLocationId");
CREATE INDEX "ScanEvent_scannedLocationId_idx" ON "ScanEvent"("scannedLocationId");
CREATE INDEX "ScanEvent_createdAt_idx" ON "ScanEvent"("createdAt");

ALTER TABLE "ScanEvent"
  ADD CONSTRAINT "ScanEvent_expectedLocationId_fkey"
  FOREIGN KEY ("expectedLocationId") REFERENCES "MasterDataRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScanEvent"
  ADD CONSTRAINT "ScanEvent_scannedLocationId_fkey"
  FOREIGN KEY ("scannedLocationId") REFERENCES "MasterDataRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScanEvent"
  ADD CONSTRAINT "ScanEvent_cylinderId_fkey"
  FOREIGN KEY ("cylinderId") REFERENCES "Cylinder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScanEvent"
  ADD CONSTRAINT "ScanEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
