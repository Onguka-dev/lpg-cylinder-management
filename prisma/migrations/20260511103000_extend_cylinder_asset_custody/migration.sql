ALTER TYPE "CylinderStatus" ADD VALUE IF NOT EXISTS 'QUARANTINED';
ALTER TYPE "CylinderStatus" ADD VALUE IF NOT EXISTS 'SCRAPPED_WRITTEN_OFF';
ALTER TYPE "CylinderStatus" ADD VALUE IF NOT EXISTS 'LOST_OVERDUE';

ALTER TABLE "Cylinder" ADD COLUMN IF NOT EXISTS "factorySerialNo" TEXT;
ALTER TABLE "Cylinder" ADD COLUMN IF NOT EXISTS "qrCode" TEXT;
ALTER TABLE "Cylinder" ADD COLUMN IF NOT EXISTS "cylinderSizeKg" INTEGER;
ALTER TABLE "Cylinder" ADD COLUMN IF NOT EXISTS "manufacturer" TEXT;
ALTER TABLE "Cylinder" ADD COLUMN IF NOT EXISTS "activeStatus" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Cylinder" ADD COLUMN IF NOT EXISTS "blockedReason" TEXT;
ALTER TABLE "Cylinder" ADD COLUMN IF NOT EXISTS "companyOwned" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Cylinder"
SET "factorySerialNo" = "serialNumber"
WHERE "factorySerialNo" IS NULL;

UPDATE "Cylinder" AS c
SET "cylinderSizeKg" = m."capacityKg"
FROM "MasterDataRecord" AS m
WHERE c."skuId" = m."id"
  AND c."cylinderSizeKg" IS NULL
  AND m."capacityKg" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Cylinder_factorySerialNo_key" ON "Cylinder"("factorySerialNo");
CREATE UNIQUE INDEX IF NOT EXISTS "Cylinder_qrCode_key" ON "Cylinder"("qrCode");
CREATE INDEX IF NOT EXISTS "Cylinder_activeStatus_idx" ON "Cylinder"("activeStatus");

CREATE TABLE IF NOT EXISTS "CustomerCylinderCustody" (
  "id" TEXT NOT NULL,
  "cylinderId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "saleReference" TEXT,
  "refillReference" TEXT,
  "expectedReturnFollowUpDate" TIMESTAMP(3),
  "returnDate" TIMESTAMP(3),
  "issueLocationId" TEXT,
  "returnLocationId" TEXT,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerCylinderCustody_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CustomerCylinderCustody_cylinderId_idx" ON "CustomerCylinderCustody"("cylinderId");
CREATE INDEX IF NOT EXISTS "CustomerCylinderCustody_customerId_idx" ON "CustomerCylinderCustody"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerCylinderCustody_returnDate_idx" ON "CustomerCylinderCustody"("returnDate");
CREATE INDEX IF NOT EXISTS "CustomerCylinderCustody_saleReference_idx" ON "CustomerCylinderCustody"("saleReference");
CREATE INDEX IF NOT EXISTS "CustomerCylinderCustody_refillReference_idx" ON "CustomerCylinderCustody"("refillReference");

ALTER TABLE "CustomerCylinderCustody" ADD CONSTRAINT "CustomerCylinderCustody_cylinderId_fkey" FOREIGN KEY ("cylinderId") REFERENCES "Cylinder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerCylinderCustody" ADD CONSTRAINT "CustomerCylinderCustody_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerCylinderCustody" ADD CONSTRAINT "CustomerCylinderCustody_issueLocationId_fkey" FOREIGN KEY ("issueLocationId") REFERENCES "MasterDataRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerCylinderCustody" ADD CONSTRAINT "CustomerCylinderCustody_returnLocationId_fkey" FOREIGN KEY ("returnLocationId") REFERENCES "MasterDataRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerCylinderCustody" ADD CONSTRAINT "CustomerCylinderCustody_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
