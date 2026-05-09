CREATE TYPE "CustomerComplaintType" AS ENUM ('GAS_LEAK', 'DELIVERY_DELAY', 'DAMAGED_CYLINDER', 'PAYMENT_QUERY', 'SERVICE_QUALITY', 'OTHER');

CREATE TYPE "CustomerComplaintPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE "CustomerComplaintStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED');

CREATE TABLE "CustomerComplaint" (
  "id" TEXT NOT NULL,
  "complaintNumber" TEXT NOT NULL,
  "customerId" TEXT,
  "locationId" TEXT,
  "type" "CustomerComplaintType" NOT NULL,
  "priority" "CustomerComplaintPriority" NOT NULL DEFAULT 'MEDIUM',
  "status" "CustomerComplaintStatus" NOT NULL DEFAULT 'SUBMITTED',
  "description" TEXT NOT NULL,
  "attachmentPlaceholder" TEXT,
  "escalationNotes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerComplaint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerComplaint_complaintNumber_key" ON "CustomerComplaint"("complaintNumber");
CREATE INDEX "CustomerComplaint_customerId_idx" ON "CustomerComplaint"("customerId");
CREATE INDEX "CustomerComplaint_locationId_idx" ON "CustomerComplaint"("locationId");
CREATE INDEX "CustomerComplaint_type_idx" ON "CustomerComplaint"("type");
CREATE INDEX "CustomerComplaint_priority_idx" ON "CustomerComplaint"("priority");
CREATE INDEX "CustomerComplaint_status_idx" ON "CustomerComplaint"("status");
CREATE INDEX "CustomerComplaint_createdAt_idx" ON "CustomerComplaint"("createdAt");

ALTER TABLE "CustomerComplaint" ADD CONSTRAINT "CustomerComplaint_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerComplaint" ADD CONSTRAINT "CustomerComplaint_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "MasterDataRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerComplaint" ADD CONSTRAINT "CustomerComplaint_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
