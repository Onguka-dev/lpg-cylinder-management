DO $$ BEGIN
  CREATE TYPE "NonCodedCylinderIntakeStatus" AS ENUM (
    'PENDING_REVIEW',
    'TAGGING_PENDING',
    'TAGGED_APPROVED',
    'APPROVED_LINKED',
    'APPROVED_NEW_CYLINDER',
    'REJECTED',
    'ESCALATED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "NonCodedCylinderCondition" AS ENUM (
    'GOOD',
    'DAMAGED',
    'LEAKING',
    'MISSING_VALVE',
    'WRONG_BRAND',
    'UNCLEAR_SERIAL',
    'NON_CODED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "NonCodedCylinderIntake" (
  "id" TEXT NOT NULL,
  "intakeNumber" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "visibleSerialNumber" TEXT NOT NULL,
  "cylinderSizeKg" INTEGER NOT NULL,
  "manufacturer" TEXT,
  "condition" "NonCodedCylinderCondition" NOT NULL,
  "photoPlaceholder" TEXT,
  "intakeLocationId" TEXT NOT NULL,
  "staffRemarks" TEXT,
  "status" "NonCodedCylinderIntakeStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "linkedCylinderId" TEXT,
  "refillOrderId" TEXT,
  "approvedBarcode" TEXT,
  "approvedQrCode" TEXT,
  "reviewNotes" TEXT,
  "createdById" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NonCodedCylinderIntake_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NonCodedCylinderIntake_intakeNumber_key" ON "NonCodedCylinderIntake"("intakeNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "NonCodedCylinderIntake_refillOrderId_key" ON "NonCodedCylinderIntake"("refillOrderId");
CREATE INDEX IF NOT EXISTS "NonCodedCylinderIntake_customerId_idx" ON "NonCodedCylinderIntake"("customerId");
CREATE INDEX IF NOT EXISTS "NonCodedCylinderIntake_intakeLocationId_idx" ON "NonCodedCylinderIntake"("intakeLocationId");
CREATE INDEX IF NOT EXISTS "NonCodedCylinderIntake_linkedCylinderId_idx" ON "NonCodedCylinderIntake"("linkedCylinderId");
CREATE INDEX IF NOT EXISTS "NonCodedCylinderIntake_status_idx" ON "NonCodedCylinderIntake"("status");
CREATE INDEX IF NOT EXISTS "NonCodedCylinderIntake_cylinderSizeKg_idx" ON "NonCodedCylinderIntake"("cylinderSizeKg");
CREATE INDEX IF NOT EXISTS "NonCodedCylinderIntake_visibleSerialNumber_idx" ON "NonCodedCylinderIntake"("visibleSerialNumber");
CREATE INDEX IF NOT EXISTS "NonCodedCylinderIntake_createdAt_idx" ON "NonCodedCylinderIntake"("createdAt");

DO $$ BEGIN
  ALTER TABLE "NonCodedCylinderIntake"
    ADD CONSTRAINT "NonCodedCylinderIntake_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "NonCodedCylinderIntake"
    ADD CONSTRAINT "NonCodedCylinderIntake_intakeLocationId_fkey"
    FOREIGN KEY ("intakeLocationId") REFERENCES "MasterDataRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "NonCodedCylinderIntake"
    ADD CONSTRAINT "NonCodedCylinderIntake_linkedCylinderId_fkey"
    FOREIGN KEY ("linkedCylinderId") REFERENCES "Cylinder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "NonCodedCylinderIntake"
    ADD CONSTRAINT "NonCodedCylinderIntake_refillOrderId_fkey"
    FOREIGN KEY ("refillOrderId") REFERENCES "RefillOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "NonCodedCylinderIntake"
    ADD CONSTRAINT "NonCodedCylinderIntake_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "NonCodedCylinderIntake"
    ADD CONSTRAINT "NonCodedCylinderIntake_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
