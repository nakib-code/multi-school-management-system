-- AlterTable
ALTER TABLE "school_settings"
ADD COLUMN "externalWebsiteUrl" TEXT,
ADD COLUMN "websiteConnectionKeyHash" TEXT,
ADD COLUMN "websiteConnectionKeyPreview" TEXT,
ADD COLUMN "landingAdminEmail" TEXT,
ADD COLUMN "landingAdminPasswordHash" TEXT;
