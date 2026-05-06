CREATE TYPE "RefillOrderStatus" AS ENUM (
  'DRAFT',
  'CLOSED',
  'CANCELLED'
);

CREATE TYPE "PaymentMethod" AS ENUM (
  'CASH',
  'MPESA',
  'CARD'
);

CREATE TYPE "PaymentStatus" AS ENUM (
  'PENDING',
  'PAID',
  'FAILED'
);

CREATE TABLE "RefillOrder" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "skuId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "filledCylinderId" TEXT NOT NULL,
  "emptyReturnCylinderId" TEXT NOT NULL,
  "status" "RefillOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "paymentMethod" "PaymentMethod" NOT NULL,
  "subtotalAmount" DECIMAL(12,2) NOT NULL,
  "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(12,2) NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "receiptNumber" TEXT NOT NULL,
  "notes" TEXT,
  "deliveryPlaceholder" TEXT,
  "creditPlaceholder" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RefillOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "paymentNumber" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PAID',
  "amount" DECIMAL(12,2) NOT NULL,
  "reference" TEXT,
  "recordedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RefillOrder_orderNumber_key" ON "RefillOrder"("orderNumber");
CREATE UNIQUE INDEX "RefillOrder_invoiceNumber_key" ON "RefillOrder"("invoiceNumber");
CREATE UNIQUE INDEX "RefillOrder_receiptNumber_key" ON "RefillOrder"("receiptNumber");
CREATE INDEX "RefillOrder_customerId_idx" ON "RefillOrder"("customerId");
CREATE INDEX "RefillOrder_skuId_idx" ON "RefillOrder"("skuId");
CREATE INDEX "RefillOrder_locationId_idx" ON "RefillOrder"("locationId");
CREATE INDEX "RefillOrder_status_idx" ON "RefillOrder"("status");
CREATE UNIQUE INDEX "Payment_paymentNumber_key" ON "Payment"("paymentNumber");
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");
CREATE INDEX "Payment_method_idx" ON "Payment"("method");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

ALTER TABLE "RefillOrder" ADD CONSTRAINT "RefillOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefillOrder" ADD CONSTRAINT "RefillOrder_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "MasterDataRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefillOrder" ADD CONSTRAINT "RefillOrder_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "MasterDataRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefillOrder" ADD CONSTRAINT "RefillOrder_filledCylinderId_fkey" FOREIGN KEY ("filledCylinderId") REFERENCES "Cylinder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefillOrder" ADD CONSTRAINT "RefillOrder_emptyReturnCylinderId_fkey" FOREIGN KEY ("emptyReturnCylinderId") REFERENCES "Cylinder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefillOrder" ADD CONSTRAINT "RefillOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RefillOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
