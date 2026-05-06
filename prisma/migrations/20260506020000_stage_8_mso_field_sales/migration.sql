CREATE TYPE "FieldSaleStatus" AS ENUM (
  'CLOSED',
  'DISCREPANCY_REPORTED'
);

CREATE TABLE "FieldSale" (
  "id" TEXT NOT NULL,
  "saleNumber" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "skuId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "routeId" TEXT,
  "zoneId" TEXT,
  "filledCylinderId" TEXT NOT NULL,
  "emptyReturnCylinderId" TEXT NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL,
  "paymentReference" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "deliveryStatus" TEXT NOT NULL,
  "discrepancyReport" TEXT,
  "offlineSyncPlaceholder" TEXT,
  "status" "FieldSaleStatus" NOT NULL DEFAULT 'CLOSED',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FieldSale_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FieldSale_saleNumber_key" ON "FieldSale"("saleNumber");
CREATE INDEX "FieldSale_customerId_idx" ON "FieldSale"("customerId");
CREATE INDEX "FieldSale_skuId_idx" ON "FieldSale"("skuId");
CREATE INDEX "FieldSale_vehicleId_idx" ON "FieldSale"("vehicleId");
CREATE INDEX "FieldSale_routeId_idx" ON "FieldSale"("routeId");
CREATE INDEX "FieldSale_zoneId_idx" ON "FieldSale"("zoneId");
CREATE INDEX "FieldSale_status_idx" ON "FieldSale"("status");

ALTER TABLE "FieldSale" ADD CONSTRAINT "FieldSale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FieldSale" ADD CONSTRAINT "FieldSale_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "MasterDataRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FieldSale" ADD CONSTRAINT "FieldSale_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "MasterDataRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FieldSale" ADD CONSTRAINT "FieldSale_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "MasterDataRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FieldSale" ADD CONSTRAINT "FieldSale_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "MasterDataRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FieldSale" ADD CONSTRAINT "FieldSale_filledCylinderId_fkey" FOREIGN KEY ("filledCylinderId") REFERENCES "Cylinder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FieldSale" ADD CONSTRAINT "FieldSale_emptyReturnCylinderId_fkey" FOREIGN KEY ("emptyReturnCylinderId") REFERENCES "Cylinder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FieldSale" ADD CONSTRAINT "FieldSale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
