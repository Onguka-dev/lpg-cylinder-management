CREATE TYPE "DeliveryStatus" AS ENUM (
  'ASSIGNED',
  'LOADING_CONFIRMED',
  'CUSTOMER_ARRIVAL',
  'DELIVERED',
  'FAILED',
  'RETURNED',
  'EXCEPTION'
);

CREATE TYPE "FailedDeliveryReason" AS ENUM (
  'CUSTOMER_UNAVAILABLE',
  'DAMAGED_CYLINDER',
  'WRONG_LOCATION',
  'PAYMENT_ISSUE',
  'PARTIAL_DELIVERY'
);

CREATE TABLE "Delivery" (
  "id" TEXT NOT NULL,
  "deliveryNumber" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "routeId" TEXT,
  "zoneId" TEXT,
  "vehicleId" TEXT,
  "assignedUserId" TEXT,
  "driverName" TEXT,
  "status" "DeliveryStatus" NOT NULL DEFAULT 'ASSIGNED',
  "failedReason" "FailedDeliveryReason",
  "otp" TEXT,
  "signaturePlaceholder" TEXT,
  "photoPlaceholder" TEXT,
  "gpsLatitude" DECIMAL(9,6),
  "gpsLongitude" DECIMAL(9,6),
  "customerRemarks" TEXT,
  "exceptionNotes" TEXT,
  "loadingConfirmedAt" TIMESTAMP(3),
  "customerArrivedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "returnedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliveryHistory" (
  "id" TEXT NOT NULL,
  "deliveryId" TEXT NOT NULL,
  "fromStatus" "DeliveryStatus",
  "toStatus" "DeliveryStatus" NOT NULL,
  "action" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "changedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DeliveryHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Delivery_deliveryNumber_key" ON "Delivery"("deliveryNumber");
CREATE UNIQUE INDEX "Delivery_orderId_key" ON "Delivery"("orderId");
CREATE INDEX "Delivery_status_idx" ON "Delivery"("status");
CREATE INDEX "Delivery_routeId_idx" ON "Delivery"("routeId");
CREATE INDEX "Delivery_zoneId_idx" ON "Delivery"("zoneId");
CREATE INDEX "Delivery_vehicleId_idx" ON "Delivery"("vehicleId");
CREATE INDEX "Delivery_assignedUserId_idx" ON "Delivery"("assignedUserId");
CREATE INDEX "DeliveryHistory_deliveryId_idx" ON "DeliveryHistory"("deliveryId");
CREATE INDEX "DeliveryHistory_createdAt_idx" ON "DeliveryHistory"("createdAt");

ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "MasterDataRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "MasterDataRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "MasterDataRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeliveryHistory" ADD CONSTRAINT "DeliveryHistory_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryHistory" ADD CONSTRAINT "DeliveryHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
