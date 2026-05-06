CREATE TYPE "OrderChannel" AS ENUM (
  'MOBILE_APP',
  'WEB',
  'RSO',
  'MSO',
  'CALL_CENTRE'
);

CREATE TYPE "OrderStatus" AS ENUM (
  'PENDING',
  'CONFIRMED',
  'ASSIGNED',
  'DISPATCHED',
  'DELIVERED',
  'CLOSED',
  'CANCELLED'
);

CREATE TABLE "CustomerOrder" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "channel" "OrderChannel" NOT NULL,
  "isPriority" BOOLEAN NOT NULL DEFAULT false,
  "deliveryZoneId" TEXT,
  "expectedDeliveryDate" TIMESTAMP(3),
  "notes" TEXT,
  "deliveryPlaceholder" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CustomerOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerOrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "skuId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CustomerOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerOrderHistory" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "fromStatus" "OrderStatus",
  "toStatus" "OrderStatus" NOT NULL,
  "action" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "changedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CustomerOrderHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerOrder_orderNumber_key" ON "CustomerOrder"("orderNumber");
CREATE INDEX "CustomerOrder_customerId_idx" ON "CustomerOrder"("customerId");
CREATE INDEX "CustomerOrder_status_idx" ON "CustomerOrder"("status");
CREATE INDEX "CustomerOrder_channel_idx" ON "CustomerOrder"("channel");
CREATE INDEX "CustomerOrder_isPriority_idx" ON "CustomerOrder"("isPriority");
CREATE INDEX "CustomerOrder_deliveryZoneId_idx" ON "CustomerOrder"("deliveryZoneId");
CREATE INDEX "CustomerOrderItem_orderId_idx" ON "CustomerOrderItem"("orderId");
CREATE INDEX "CustomerOrderItem_skuId_idx" ON "CustomerOrderItem"("skuId");
CREATE INDEX "CustomerOrderHistory_orderId_idx" ON "CustomerOrderHistory"("orderId");
CREATE INDEX "CustomerOrderHistory_createdAt_idx" ON "CustomerOrderHistory"("createdAt");

ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_deliveryZoneId_fkey" FOREIGN KEY ("deliveryZoneId") REFERENCES "MasterDataRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerOrderItem" ADD CONSTRAINT "CustomerOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerOrderItem" ADD CONSTRAINT "CustomerOrderItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "MasterDataRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerOrderHistory" ADD CONSTRAINT "CustomerOrderHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerOrderHistory" ADD CONSTRAINT "CustomerOrderHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
