-- AlterTable: Enable online admission by default for all schools
ALTER TABLE "school_settings"
  ALTER COLUMN "hasOnlineAdmission" SET DEFAULT true;

-- Backfill existing school_settings rows so online admission is active by default
UPDATE "school_settings"
  SET "hasOnlineAdmission" = true
  WHERE "hasOnlineAdmission" = false;
