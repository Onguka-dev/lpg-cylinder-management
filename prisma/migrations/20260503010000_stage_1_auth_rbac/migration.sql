-- Stage 1 authentication and RBAC starter changes.

CREATE TYPE "RoleName_new" AS ENUM ('ADMIN', 'WAREHOUSE_MANAGER', 'RSO', 'MSO', 'AUDITOR', 'CUSTOMER');

ALTER TABLE "Role"
  ALTER COLUMN "name" TYPE "RoleName_new"
  USING (
    CASE
      WHEN "name"::text = 'WAREHOUSE' THEN 'WAREHOUSE_MANAGER'
      ELSE "name"::text
    END
  )::"RoleName_new";

DROP TYPE "RoleName";
ALTER TYPE "RoleName_new" RENAME TO "RoleName";

ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT 'demo-password-needs-seed';

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
