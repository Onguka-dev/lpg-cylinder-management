-- CreateEnum
CREATE TYPE "IntegrationProviderType" AS ENUM ('SAP_ACCOUNTING', 'PAYMENT_GATEWAY', 'SMS_EMAIL', 'BARCODE_RFID', 'MAPS_GPS');

-- CreateEnum
CREATE TYPE "IntegrationLogStatus" AS ENUM ('QUEUED', 'SUCCESS', 'FAILED', 'RETRY_QUEUED');

-- CreateTable
CREATE TABLE "IntegrationSetting" (
    "id" TEXT NOT NULL,
    "providerType" "IntegrationProviderType" NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "endpointPlaceholder" TEXT,
    "credentialPlaceholder" TEXT,
    "mockFailureRate" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationLog" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "providerType" "IntegrationProviderType" NOT NULL,
    "settingId" TEXT,
    "action" TEXT NOT NULL,
    "requestStatus" "IntegrationLogStatus" NOT NULL DEFAULT 'QUEUED',
    "responseStatus" "IntegrationLogStatus",
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "relatedRecord" TEXT,
    "payload" JSONB,
    "responsePayload" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationSetting_providerType_key" ON "IntegrationSetting"("providerType");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationLog_reference_key" ON "IntegrationLog"("reference");

-- CreateIndex
CREATE INDEX "IntegrationLog_providerType_idx" ON "IntegrationLog"("providerType");

-- CreateIndex
CREATE INDEX "IntegrationLog_requestStatus_idx" ON "IntegrationLog"("requestStatus");

-- CreateIndex
CREATE INDEX "IntegrationLog_responseStatus_idx" ON "IntegrationLog"("responseStatus");

-- CreateIndex
CREATE INDEX "IntegrationLog_relatedRecord_idx" ON "IntegrationLog"("relatedRecord");

-- CreateIndex
CREATE INDEX "IntegrationLog_createdAt_idx" ON "IntegrationLog"("createdAt");

-- AddForeignKey
ALTER TABLE "IntegrationLog" ADD CONSTRAINT "IntegrationLog_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "IntegrationSetting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationLog" ADD CONSTRAINT "IntegrationLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
