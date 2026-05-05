CREATE TYPE "InventoryMovementType" AS ENUM (
  'OPENING_BALANCE',
  'RECEIPT',
  'ISSUE',
  'TRANSFER',
  'RETURN_FROM_CUSTOMER',
  'RETURN_FROM_VEHICLE',
  'ADJUSTMENT',
  'DAMAGED_QUARANTINE',
  'MAINTENANCE_TRANSFER'
);

CREATE TYPE "InventoryMovementStatus" AS ENUM (
  'REQUESTED',
  'APPROVED',
  'DISPATCHED',
  'RECEIVED',
  'COMPLETED',
  'VARIANCE_LOGGED',
  'REJECTED'
);

CREATE TABLE "InventoryMovement" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "type" "InventoryMovementType" NOT NULL,
  "status" "InventoryMovementStatus" NOT NULL DEFAULT 'REQUESTED',
  "skuId" TEXT NOT NULL,
  "sourceLocationId" TEXT,
  "destinationLocationId" TEXT,
  "sourceStatus" "CylinderStatus",
  "destinationStatus" "CylinderStatus" NOT NULL,
  "requestedQuantity" INTEGER NOT NULL,
  "approvedQuantity" INTEGER,
  "dispatchedQuantity" INTEGER,
  "receivedQuantity" INTEGER,
  "varianceQuantity" INTEGER,
  "varianceReason" TEXT,
  "notes" TEXT,
  "requestedById" TEXT,
  "approvedById" TEXT,
  "dispatchedById" TEXT,
  "receivedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "dispatchedAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryMovementCylinder" (
  "id" TEXT NOT NULL,
  "movementId" TEXT NOT NULL,
  "cylinderId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InventoryMovementCylinder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryMovementHistory" (
  "id" TEXT NOT NULL,
  "movementId" TEXT NOT NULL,
  "fromStatus" "InventoryMovementStatus",
  "toStatus" "InventoryMovementStatus" NOT NULL,
  "action" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "changedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InventoryMovementHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryMovement_reference_key" ON "InventoryMovement"("reference");
CREATE INDEX "InventoryMovement_type_idx" ON "InventoryMovement"("type");
CREATE INDEX "InventoryMovement_status_idx" ON "InventoryMovement"("status");
CREATE INDEX "InventoryMovement_skuId_idx" ON "InventoryMovement"("skuId");
CREATE INDEX "InventoryMovement_sourceLocationId_idx" ON "InventoryMovement"("sourceLocationId");
CREATE INDEX "InventoryMovement_destinationLocationId_idx" ON "InventoryMovement"("destinationLocationId");
CREATE UNIQUE INDEX "InventoryMovementCylinder_movementId_cylinderId_key" ON "InventoryMovementCylinder"("movementId", "cylinderId");
CREATE INDEX "InventoryMovementCylinder_cylinderId_idx" ON "InventoryMovementCylinder"("cylinderId");
CREATE INDEX "InventoryMovementHistory_movementId_idx" ON "InventoryMovementHistory"("movementId");
CREATE INDEX "InventoryMovementHistory_createdAt_idx" ON "InventoryMovementHistory"("createdAt");

ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "MasterDataRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES "MasterDataRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "MasterDataRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_dispatchedById_fkey" FOREIGN KEY ("dispatchedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryMovementCylinder" ADD CONSTRAINT "InventoryMovementCylinder_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "InventoryMovement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryMovementCylinder" ADD CONSTRAINT "InventoryMovementCylinder_cylinderId_fkey" FOREIGN KEY ("cylinderId") REFERENCES "Cylinder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryMovementHistory" ADD CONSTRAINT "InventoryMovementHistory_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "InventoryMovement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryMovementHistory" ADD CONSTRAINT "InventoryMovementHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
