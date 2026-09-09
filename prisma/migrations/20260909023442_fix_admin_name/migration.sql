/*
  Warnings:

  - You are about to drop the column `aadminName` on the `schools` table. All the data in the column will be lost.
  - You are about to drop the column `adminEmailVerificationCode` on the `schools` table. All the data in the column will be lost.
  - You are about to drop the column `adminEmailVerificationExpiresAt` on the `schools` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "schools" DROP COLUMN "aadminName",
DROP COLUMN "adminEmailVerificationCode",
DROP COLUMN "adminEmailVerificationExpiresAt",
ADD COLUMN     "adminName" TEXT;
