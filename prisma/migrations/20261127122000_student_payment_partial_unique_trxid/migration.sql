-- Allow resubmitting a previously REJECTED trxId while keeping non-rejected trxIds unique
DROP INDEX IF EXISTS "student_payments_trxId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "student_payments_trxId_active_unique"
ON "student_payments" ("trxId")
WHERE "status" <> 'REJECTED';

CREATE INDEX IF NOT EXISTS "student_payments_trxId_idx"
ON "student_payments" ("trxId");
