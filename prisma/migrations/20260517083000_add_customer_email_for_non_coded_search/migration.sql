ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "email" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_email_key" ON "Customer"("email");
