-- Allow resubmitting a previously REJECTED subscription payment trxId while keeping non-rejected trxIds unique
DROP INDEX IF EXISTS "subscription_payments_trxId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_payments_trxId_active_unique"
ON "subscription_payments" ("trxId")
WHERE "status" <> 'REJECTED';

CREATE INDEX IF NOT EXISTS "subscription_payments_trxId_idx"
ON "subscription_payments" ("trxId");

-- Separate School Admin pause toggle from Super Admin master online admission flag
ALTER TABLE "school_settings"
ADD COLUMN IF NOT EXISTS "onlineAdmissionPaused" BOOLEAN NOT NULL DEFAULT false;

-- Support explicit OVERDUE status on StudentFee records
ALTER TYPE "FeeStatus" ADD VALUE IF NOT EXISTS 'OVERDUE';
