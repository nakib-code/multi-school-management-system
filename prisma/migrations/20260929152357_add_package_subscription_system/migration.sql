/*
  Warnings:

  - You are about to drop the column `adminEmail` on the `schools` table. All the data in the column will be lost.
  - You are about to drop the column `adminEmailVerified` on the `schools` table. All the data in the column will be lost.
  - You are about to drop the column `adminName` on the `schools` table. All the data in the column will be lost.
  - You are about to drop the column `adminPasswordHash` on the `schools` table. All the data in the column will be lost.
  - You are about to drop the column `adminPhone` on the `schools` table. All the data in the column will be lost.
  - You are about to drop the column `rejectionReason` on the `schools` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING');

-- CreateEnum
CREATE TYPE "PackageFeature" AS ENUM ('SCHOOL_MANAGEMENT', 'USER_MANAGEMENT', 'STUDENT_MANAGEMENT', 'TEACHER_MANAGEMENT', 'GUARDIAN_MANAGEMENT', 'ADMISSION', 'ATTENDANCE', 'CLASS_MANAGEMENT', 'SUBJECT_MANAGEMENT', 'EXAM_MANAGEMENT', 'RESULT_MANAGEMENT', 'FEES_MANAGEMENT', 'PAYMENT_MANAGEMENT', 'TEACHER_SALARY', 'REPORTS', 'NOTIFICATIONS');

-- AlterTable
ALTER TABLE "schools" DROP COLUMN "adminEmail",
DROP COLUMN "adminEmailVerified",
DROP COLUMN "adminName",
DROP COLUMN "adminPasswordHash",
DROP COLUMN "adminPhone",
DROP COLUMN "rejectionReason";

-- CreateTable
CREATE TABLE "packages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "studentLimit" INTEGER NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_feature_configs" (
    "id" SERIAL NOT NULL,
    "packageId" INTEGER NOT NULL,
    "feature" "PackageFeature" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_feature_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_subscriptions" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "packageId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "price" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "packages_name_key" ON "packages"("name");

-- CreateIndex
CREATE INDEX "packages_isActive_idx" ON "packages"("isActive");

-- CreateIndex
CREATE INDEX "packages_isCustom_idx" ON "packages"("isCustom");

-- CreateIndex
CREATE INDEX "package_feature_configs_packageId_idx" ON "package_feature_configs"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "package_feature_configs_packageId_feature_key" ON "package_feature_configs"("packageId", "feature");

-- CreateIndex
CREATE INDEX "school_subscriptions_schoolId_idx" ON "school_subscriptions"("schoolId");

-- CreateIndex
CREATE INDEX "school_subscriptions_packageId_idx" ON "school_subscriptions"("packageId");

-- CreateIndex
CREATE INDEX "school_subscriptions_status_idx" ON "school_subscriptions"("status");

-- CreateIndex
CREATE INDEX "school_subscriptions_startDate_idx" ON "school_subscriptions"("startDate");

-- CreateIndex
CREATE INDEX "school_subscriptions_endDate_idx" ON "school_subscriptions"("endDate");

-- AddForeignKey
ALTER TABLE "package_feature_configs" ADD CONSTRAINT "package_feature_configs_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_subscriptions" ADD CONSTRAINT "school_subscriptions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_subscriptions" ADD CONSTRAINT "school_subscriptions_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
