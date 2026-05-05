CREATE TYPE "CylinderStatus" AS ENUM (
  'FILLED',
  'EMPTY',
  'DAMAGED',
  'IN_TRANSIT',
  'RESERVED',
  'UNDER_MAINTENANCE',
  'WITH_CUSTOMER'
);

CREATE TABLE "Cylinder" (
  "id" TEXT NOT NULL,
  "serialNumber" TEXT NOT NULL,
  "barcode" TEXT,
  "skuId" TEXT NOT NULL,
  "manufactureDate" TIMESTAMP(3),
  "inspectionDueDate" TIMESTAMP(3),
  "currentLocationId" TEXT NOT NULL,
  "status" "CylinderStatus" NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Cylinder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CylinderHistory" (
  "id" TEXT NOT NULL,
  "cylinderId" TEXT NOT NULL,
  "previousStatus" "CylinderStatus",
  "newStatus" "CylinderStatus" NOT NULL,
  "previousLocationId" TEXT,
  "newLocationId" TEXT NOT NULL,
  "changedById" TEXT,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CylinderHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpeningBalanceBatch" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OpeningBalanceBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpeningBalanceLine" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "skuId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "status" "CylinderStatus" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "serialPrefix" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OpeningBalanceLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Cylinder_serialNumber_key" ON "Cylinder"("serialNumber");
CREATE UNIQUE INDEX "Cylinder_barcode_key" ON "Cylinder"("barcode");
CREATE INDEX "Cylinder_skuId_idx" ON "Cylinder"("skuId");
CREATE INDEX "Cylinder_currentLocationId_idx" ON "Cylinder"("currentLocationId");
CREATE INDEX "Cylinder_status_idx" ON "Cylinder"("status");
CREATE INDEX "CylinderHistory_cylinderId_idx" ON "CylinderHistory"("cylinderId");
CREATE INDEX "CylinderHistory_createdAt_idx" ON "CylinderHistory"("createdAt");
CREATE UNIQUE INDEX "OpeningBalanceBatch_reference_key" ON "OpeningBalanceBatch"("reference");
CREATE INDEX "OpeningBalanceLine_skuId_idx" ON "OpeningBalanceLine"("skuId");
CREATE INDEX "OpeningBalanceLine_locationId_idx" ON "OpeningBalanceLine"("locationId");
CREATE INDEX "OpeningBalanceLine_status_idx" ON "OpeningBalanceLine"("status");

ALTER TABLE "Cylinder" ADD CONSTRAINT "Cylinder_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "MasterDataRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Cylinder" ADD CONSTRAINT "Cylinder_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "MasterDataRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CylinderHistory" ADD CONSTRAINT "CylinderHistory_cylinderId_fkey" FOREIGN KEY ("cylinderId") REFERENCES "Cylinder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CylinderHistory" ADD CONSTRAINT "CylinderHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OpeningBalanceBatch" ADD CONSTRAINT "OpeningBalanceBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OpeningBalanceLine" ADD CONSTRAINT "OpeningBalanceLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "OpeningBalanceBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpeningBalanceLine" ADD CONSTRAINT "OpeningBalanceLine_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "MasterDataRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpeningBalanceLine" ADD CONSTRAINT "OpeningBalanceLine_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "MasterDataRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
