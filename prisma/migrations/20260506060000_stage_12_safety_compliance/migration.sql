CREATE TYPE "CylinderMaintenanceStatus" AS ENUM ('NONE', 'OPEN', 'IN_PROGRESS', 'CLEARED', 'SCRAP_PLACEHOLDER');
CREATE TYPE "MaintenanceCaseStatus" AS ENUM ('OPEN', 'INSPECTION_RECORDED', 'QUARANTINED', 'APPROVED_RETURN_TO_STOCK', 'SCRAP_PLACEHOLDER', 'CLOSED');
CREATE TYPE "InspectionResult" AS ENUM ('PASSED', 'FAILED', 'NEEDS_HYDRO_TEST', 'UNSAFE');
CREATE TYPE "SafetyIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

ALTER TABLE "Cylinder"
ADD COLUMN "expiryDate" TIMESTAMP(3),
ADD COLUMN "hydroTestDueDate" TIMESTAMP(3),
ADD COLUMN "unsafeStatus" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "quarantinedStatus" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "maintenanceStatus" "CylinderMaintenanceStatus" NOT NULL DEFAULT 'NONE';

CREATE TABLE "MaintenanceCase" (
  "id" TEXT NOT NULL,
  "caseNumber" TEXT NOT NULL,
  "cylinderId" TEXT NOT NULL,
  "status" "MaintenanceCaseStatus" NOT NULL DEFAULT 'OPEN',
  "reason" TEXT NOT NULL,
  "inspectionResult" "InspectionResult",
  "inspectionNotes" TEXT,
  "quarantineMovementId" TEXT,
  "returnApprovalNotes" TEXT,
  "scrapWriteOffPlaceholder" TEXT,
  "certificateUploadPlaceholder" TEXT,
  "documentUploadPlaceholder" TEXT,
  "createdById" TEXT,
  "inspectedById" TEXT,
  "approvedById" TEXT,
  "inspectedAt" TIMESTAMP(3),
  "quarantinedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaintenanceCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SafetyIncident" (
  "id" TEXT NOT NULL,
  "incidentNumber" TEXT NOT NULL,
  "cylinderId" TEXT,
  "title" TEXT NOT NULL,
  "severity" "SafetyIncidentSeverity" NOT NULL,
  "incidentDate" TIMESTAMP(3) NOT NULL,
  "locationId" TEXT,
  "description" TEXT NOT NULL,
  "correctiveAction" TEXT,
  "certificateUploadPlaceholder" TEXT,
  "photoUploadPlaceholder" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SafetyIncident_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MaintenanceCase_caseNumber_key" ON "MaintenanceCase"("caseNumber");
CREATE INDEX "MaintenanceCase_cylinderId_idx" ON "MaintenanceCase"("cylinderId");
CREATE INDEX "MaintenanceCase_status_idx" ON "MaintenanceCase"("status");
CREATE INDEX "MaintenanceCase_inspectionResult_idx" ON "MaintenanceCase"("inspectionResult");
CREATE UNIQUE INDEX "SafetyIncident_incidentNumber_key" ON "SafetyIncident"("incidentNumber");
CREATE INDEX "SafetyIncident_cylinderId_idx" ON "SafetyIncident"("cylinderId");
CREATE INDEX "SafetyIncident_severity_idx" ON "SafetyIncident"("severity");
CREATE INDEX "SafetyIncident_incidentDate_idx" ON "SafetyIncident"("incidentDate");
CREATE INDEX "Cylinder_unsafeStatus_idx" ON "Cylinder"("unsafeStatus");
CREATE INDEX "Cylinder_quarantinedStatus_idx" ON "Cylinder"("quarantinedStatus");
CREATE INDEX "Cylinder_maintenanceStatus_idx" ON "Cylinder"("maintenanceStatus");
CREATE INDEX "Cylinder_expiryDate_idx" ON "Cylinder"("expiryDate");
CREATE INDEX "Cylinder_hydroTestDueDate_idx" ON "Cylinder"("hydroTestDueDate");

ALTER TABLE "MaintenanceCase" ADD CONSTRAINT "MaintenanceCase_cylinderId_fkey" FOREIGN KEY ("cylinderId") REFERENCES "Cylinder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceCase" ADD CONSTRAINT "MaintenanceCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceCase" ADD CONSTRAINT "MaintenanceCase_inspectedById_fkey" FOREIGN KEY ("inspectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceCase" ADD CONSTRAINT "MaintenanceCase_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_cylinderId_fkey" FOREIGN KEY ("cylinderId") REFERENCES "Cylinder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
