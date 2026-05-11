CREATE TABLE IF NOT EXISTS "FullCylinderSale" (
  "id" TEXT NOT NULL,
  "saleNumber" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "skuId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "cylinderId" TEXT NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL,
  "paymentReference" TEXT,
  "cylinderAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "gasAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(12,2) NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "receiptNumber" TEXT NOT NULL,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FullCylinderSale_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FullCylinderSale_saleNumber_key" ON "FullCylinderSale"("saleNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "FullCylinderSale_invoiceNumber_key" ON "FullCylinderSale"("invoiceNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "FullCylinderSale_receiptNumber_key" ON "FullCylinderSale"("receiptNumber");
CREATE INDEX IF NOT EXISTS "FullCylinderSale_customerId_idx" ON "FullCylinderSale"("customerId");
CREATE INDEX IF NOT EXISTS "FullCylinderSale_skuId_idx" ON "FullCylinderSale"("skuId");
CREATE INDEX IF NOT EXISTS "FullCylinderSale_locationId_idx" ON "FullCylinderSale"("locationId");
CREATE INDEX IF NOT EXISTS "FullCylinderSale_cylinderId_idx" ON "FullCylinderSale"("cylinderId");
CREATE INDEX IF NOT EXISTS "FullCylinderSale_createdAt_idx" ON "FullCylinderSale"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'FullCylinderSale_customerId_fkey'
  ) THEN
    ALTER TABLE "FullCylinderSale" ADD CONSTRAINT "FullCylinderSale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'FullCylinderSale_skuId_fkey'
  ) THEN
    ALTER TABLE "FullCylinderSale" ADD CONSTRAINT "FullCylinderSale_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "MasterDataRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'FullCylinderSale_locationId_fkey'
  ) THEN
    ALTER TABLE "FullCylinderSale" ADD CONSTRAINT "FullCylinderSale_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "MasterDataRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'FullCylinderSale_cylinderId_fkey'
  ) THEN
    ALTER TABLE "FullCylinderSale" ADD CONSTRAINT "FullCylinderSale_cylinderId_fkey" FOREIGN KEY ("cylinderId") REFERENCES "Cylinder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'FullCylinderSale_createdById_fkey'
  ) THEN
    ALTER TABLE "FullCylinderSale" ADD CONSTRAINT "FullCylinderSale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
