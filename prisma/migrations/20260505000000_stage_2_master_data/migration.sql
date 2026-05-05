CREATE TYPE "MasterDataType" AS ENUM (
  'SKU_MASTER',
  'CYLINDER_SIZE',
  'CYLINDER_CATEGORY',
  'PRICE',
  'TAX',
  'DISCOUNT_PROMOTION',
  'DELIVERY_FEE',
  'REGION',
  'ZONE',
  'ROUTE',
  'LOCATION',
  'WAREHOUSE',
  'RETAIL_OUTLET',
  'VEHICLE',
  'MAINTENANCE_LOCATION',
  'DAMAGED_QUARANTINE_LOCATION',
  'STOCK_THRESHOLD'
);

CREATE TABLE "MasterDataRecord" (
  "id" TEXT NOT NULL,
  "type" "MasterDataType" NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "amount" DECIMAL(12, 2),
  "rate" DECIMAL(5, 2),
  "capacityKg" INTEGER,
  "threshold" INTEGER,
  "parentId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MasterDataRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MasterDataRecord_type_code_key" ON "MasterDataRecord"("type", "code");
CREATE INDEX "MasterDataRecord_type_isActive_idx" ON "MasterDataRecord"("type", "isActive");

ALTER TABLE "MasterDataRecord" ADD CONSTRAINT "MasterDataRecord_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MasterDataRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
