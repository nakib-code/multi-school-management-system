/*
  Warnings:

  - You are about to drop the column `isActive` on the `schools` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SchoolStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'BLOCKED');

-- AlterTable
ALTER TABLE "schools" DROP COLUMN "isActive",
ADD COLUMN     "status" "SchoolStatus" NOT NULL DEFAULT 'PENDING';
