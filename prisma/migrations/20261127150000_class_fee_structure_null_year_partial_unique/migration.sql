-- Partial unique index so concurrent upserts for default (academicYear IS NULL) class fees cannot duplicate
CREATE UNIQUE INDEX IF NOT EXISTS "class_fee_structures_default_year_unique"
ON "class_fee_structures"("schoolId", "classId", "feeType")
WHERE "academicYear" IS NULL;
