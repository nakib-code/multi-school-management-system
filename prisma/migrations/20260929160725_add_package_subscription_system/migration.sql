-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "adminEmail" TEXT,
ADD COLUMN     "adminEmailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "adminName" TEXT,
ADD COLUMN     "adminPasswordHash" TEXT,
ADD COLUMN     "adminPhone" TEXT;
