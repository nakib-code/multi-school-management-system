-- Drop foreign keys and obsolete tables
DROP TABLE IF EXISTS "custom_package_request_features" CASCADE;
DROP TABLE IF EXISTS "custom_package_requests" CASCADE;
DROP TABLE IF EXISTS "package_feature_configs" CASCADE;

-- Drop isCustom index and column from packages
DROP INDEX IF EXISTS "packages_isCustom_idx";
ALTER TABLE "packages" DROP COLUMN IF EXISTS "isCustom";

-- Migrate any CUSTOM billingCycle rows to MONTHLY before altering BillingCycle enum
UPDATE "packages" SET "billingCycle" = 'MONTHLY' WHERE "billingCycle" = 'CUSTOM';

-- AlterEnum BillingCycle (remove CUSTOM)
BEGIN;
CREATE TYPE "BillingCycle_new" AS ENUM ('MONTHLY', 'YEARLY');
ALTER TABLE "packages" ALTER COLUMN "billingCycle" DROP DEFAULT;
ALTER TABLE "packages" ALTER COLUMN "billingCycle" TYPE "BillingCycle_new" USING ("billingCycle"::text::"BillingCycle_new");
ALTER TYPE "BillingCycle" RENAME TO "BillingCycle_old";
ALTER TYPE "BillingCycle_new" RENAME TO "BillingCycle";
DROP TYPE "BillingCycle_old";
ALTER TABLE "packages" ALTER COLUMN "billingCycle" SET DEFAULT 'MONTHLY';
COMMIT;

-- Drop obsolete enums
DROP TYPE IF EXISTS "CustomPackageRequestStatus";
DROP TYPE IF EXISTS "PackageFeature";
