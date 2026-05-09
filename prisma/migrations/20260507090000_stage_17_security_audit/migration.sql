CREATE TYPE "UserSessionStatus" AS ENUM ('ACTIVE', 'LOGGED_OUT', 'EXPIRED', 'REVOKED');

CREATE TYPE "AuditEventCategory" AS ENUM ('AUTH', 'MASTER_DATA', 'CUSTOMER', 'INVENTORY', 'APPROVAL', 'ORDER', 'DELIVERY', 'BILLING', 'PAYMENT', 'RECONCILIATION', 'COMPLIANCE', 'INTEGRATION', 'NOTIFICATION', 'OFFLINE_SYNC', 'SECURITY', 'SYSTEM');

CREATE TYPE "AuditSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

ALTER TABLE "AuditLog"
  ADD COLUMN "category" "AuditEventCategory" NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
  ADD COLUMN "entityType" TEXT,
  ADD COLUMN "entityId" TEXT,
  ADD COLUMN "ipAddress" TEXT,
  ADD COLUMN "userAgent" TEXT,
  ADD COLUMN "metadata" JSONB;

CREATE TABLE "UserSession" (
  "id" TEXT NOT NULL,
  "sessionTokenId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "UserSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "deviceLabel" TEXT,
  "mfaVerified" BOOLEAN NOT NULL DEFAULT false,
  "mfaPlaceholder" TEXT,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecurityControlSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SecurityControlSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSession_sessionTokenId_key" ON "UserSession"("sessionTokenId");
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");
CREATE INDEX "UserSession_status_idx" ON "UserSession"("status");
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");
CREATE INDEX "UserSession_lastSeenAt_idx" ON "UserSession"("lastSeenAt");
CREATE UNIQUE INDEX "SecurityControlSetting_key_key" ON "SecurityControlSetting"("key");
CREATE INDEX "AuditLog_category_idx" ON "AuditLog"("category");
CREATE INDEX "AuditLog_severity_idx" ON "AuditLog"("severity");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
