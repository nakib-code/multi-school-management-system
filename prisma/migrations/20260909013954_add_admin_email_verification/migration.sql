/*
  Warnings:

  - You are about to drop the column `adminName` on the `schools` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "schools" DROP COLUMN "adminName",
ADD COLUMN     "aadminName" TEXT,
ADD COLUMN     "adminEmailVerificationCode" TEXT,
ADD COLUMN     "adminEmailVerificationExpiresAt" TIMESTAMP(3),
ADD COLUMN     "adminEmailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "adminPasswordHash" TEXT;
