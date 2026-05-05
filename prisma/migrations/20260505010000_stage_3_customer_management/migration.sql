CREATE TYPE "CustomerCategory" AS ENUM ('DOMESTIC', 'COMMERCIAL', 'INDUSTRIAL');

CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BLACKLISTED');

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "proofReference" TEXT NOT NULL,
  "category" "CustomerCategory" NOT NULL,
  "address" TEXT NOT NULL,
  "latitude" DECIMAL(9, 6),
  "longitude" DECIMAL(9, 6),
  "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
  "creditLimit" DECIMAL(12, 2),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");
CREATE UNIQUE INDEX "Customer_proofReference_key" ON "Customer"("proofReference");
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
CREATE INDEX "Customer_status_idx" ON "Customer"("status");
CREATE INDEX "Customer_category_idx" ON "Customer"("category");
