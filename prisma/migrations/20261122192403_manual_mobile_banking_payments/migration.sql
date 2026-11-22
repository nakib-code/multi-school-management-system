/*
  Warnings:

  - The values [CASH,BANK,MOBILE_BANKING,ONLINE] on the enum `PaymentMethod` will be removed. If these variants are still used in the database, this will fail.
  - The values [COMPLETED,FAILED,REFUNDED] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [ONLINE,CASH] on the enum `SubscriptionPaymentMethod` will be removed. If these variants are still used in the database, this will fail.
  - The values [PAID,FAILED,CANCELLED] on the enum `SubscriptionPaymentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `amount` on the `student_payments` table. All the data in the column will be lost.
  - You are about to drop the column `receivedBy` on the `student_payments` table. All the data in the column will be lost.
  - You are about to drop the column `transactionId` on the `student_payments` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `subscription_payments` table. All the data in the column will be lost.
  - You are about to drop the column `gatewayAmount` on the `subscription_payments` table. All the data in the column will be lost.
  - You are about to drop the column `gatewayCurrency` on the `subscription_payments` table. All the data in the column will be lost.
  - You are about to drop the column `transactionId` on the `subscription_payments` table. All the data in the column will be lost.
  - You are about to drop the column `validationId` on the `subscription_payments` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[trxId]` on the table `student_payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[trxId]` on the table `subscription_payments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `paidAmount` to the `student_payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderNumber` to the `student_payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trxId` to the `student_payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paidAmount` to the `subscription_payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderNumber` to the `subscription_payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trxId` to the `subscription_payments` table without a default value. This is not possible if the table is not empty.
  - Made the column `paidAt` on table `subscription_payments` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "HefzWing" AS ENUM ('NAJERA', 'HEFZ');

-- CreateEnum
CREATE TYPE "HefzEnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "SobokQuality" AS ENUM ('GOOD', 'AVERAGE', 'WEAK', 'REVISE');

-- CreateEnum
CREATE TYPE "HefzAttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PackageFeature" ADD VALUE 'KINDERGARTEN_MODULE';
ALTER TYPE "PackageFeature" ADD VALUE 'HEFZ_MODULE';

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethod_new" AS ENUM ('BKASH', 'NAGAD', 'ROCKET');
ALTER TABLE "student_payments" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod_new" USING ("paymentMethod"::text::"PaymentMethod_new");
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
DROP TYPE "public"."PaymentMethod_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
ALTER TABLE "public"."student_payments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "student_payments" ALTER COLUMN "status" TYPE "PaymentStatus_new" USING ("status"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "public"."PaymentStatus_old";
ALTER TABLE "student_payments" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionPaymentMethod_new" AS ENUM ('BKASH', 'NAGAD', 'ROCKET');
ALTER TABLE "public"."subscription_payments" ALTER COLUMN "paymentMethod" DROP DEFAULT;
ALTER TABLE "subscription_payments" ALTER COLUMN "paymentMethod" TYPE "SubscriptionPaymentMethod_new" USING ("paymentMethod"::text::"SubscriptionPaymentMethod_new");
ALTER TYPE "SubscriptionPaymentMethod" RENAME TO "SubscriptionPaymentMethod_old";
ALTER TYPE "SubscriptionPaymentMethod_new" RENAME TO "SubscriptionPaymentMethod";
DROP TYPE "public"."SubscriptionPaymentMethod_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionPaymentStatus_new" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
ALTER TABLE "public"."subscription_payments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "subscription_payments" ALTER COLUMN "status" TYPE "SubscriptionPaymentStatus_new" USING ("status"::text::"SubscriptionPaymentStatus_new");
ALTER TYPE "SubscriptionPaymentStatus" RENAME TO "SubscriptionPaymentStatus_old";
ALTER TYPE "SubscriptionPaymentStatus_new" RENAME TO "SubscriptionPaymentStatus";
DROP TYPE "public"."SubscriptionPaymentStatus_old";
ALTER TABLE "subscription_payments" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "student_payments" DROP CONSTRAINT "student_payments_receivedBy_fkey";

-- DropIndex
DROP INDEX "student_payments_transactionId_key";

-- DropIndex
DROP INDEX "subscription_payments_transactionId_key";

-- DropIndex
DROP INDEX "subscription_payments_validationId_key";

-- AlterTable
ALTER TABLE "school_settings" ADD COLUMN     "bkashNumber" TEXT,
ADD COLUMN     "nagadNumber" TEXT,
ADD COLUMN     "rocketNumber" TEXT;

-- AlterTable
ALTER TABLE "student_payments" DROP COLUMN "amount",
DROP COLUMN "receivedBy",
DROP COLUMN "transactionId",
ADD COLUMN     "paidAmount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "receiverNumber" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "senderNumber" TEXT NOT NULL,
ADD COLUMN     "trxId" TEXT NOT NULL,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" INTEGER,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "subscription_payments" DROP COLUMN "amount",
DROP COLUMN "gatewayAmount",
DROP COLUMN "gatewayCurrency",
DROP COLUMN "transactionId",
DROP COLUMN "validationId",
ADD COLUMN     "paidAmount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "receiverNumber" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "senderNumber" TEXT NOT NULL,
ADD COLUMN     "trxId" TEXT NOT NULL,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" INTEGER,
ALTER COLUMN "paymentMethod" DROP DEFAULT,
ALTER COLUMN "paidAt" SET NOT NULL,
ALTER COLUMN "paidAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "hefz_daily_logs" (
    "id" SERIAL NOT NULL,
    "hefzEnrollmentId" INTEGER NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "logDate" TIMESTAMP(3) NOT NULL,
    "sobok" TEXT NOT NULL,
    "sobokPagesOrLines" TEXT,
    "sobokQuality" "SobokQuality" NOT NULL DEFAULT 'GOOD',
    "sobokAm" TEXT,
    "manzil" TEXT,
    "manzilParas" TEXT,
    "attendanceStatus" "HefzAttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "ustadNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hefz_daily_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hefz_enrollments" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "ustadId" INTEGER NOT NULL,
    "wing" "HefzWing" NOT NULL DEFAULT 'NAJERA',
    "currentPara" INTEGER,
    "currentSurah" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "HefzEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hefz_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hefz_daily_logs_schoolId_idx" ON "hefz_daily_logs"("schoolId");

-- CreateIndex
CREATE INDEX "hefz_daily_logs_hefzEnrollmentId_idx" ON "hefz_daily_logs"("hefzEnrollmentId");

-- CreateIndex
CREATE INDEX "hefz_daily_logs_schoolId_logDate_idx" ON "hefz_daily_logs"("schoolId", "logDate");

-- CreateIndex
CREATE UNIQUE INDEX "hefz_daily_logs_hefzEnrollmentId_logDate_key" ON "hefz_daily_logs"("hefzEnrollmentId", "logDate");

-- CreateIndex
CREATE INDEX "hefz_enrollments_schoolId_idx" ON "hefz_enrollments"("schoolId");

-- CreateIndex
CREATE INDEX "hefz_enrollments_studentId_idx" ON "hefz_enrollments"("studentId");

-- CreateIndex
CREATE INDEX "hefz_enrollments_ustadId_idx" ON "hefz_enrollments"("ustadId");

-- CreateIndex
CREATE INDEX "hefz_enrollments_schoolId_wing_status_idx" ON "hefz_enrollments"("schoolId", "wing", "status");

-- CreateIndex
CREATE UNIQUE INDEX "student_payments_trxId_key" ON "student_payments"("trxId");

-- CreateIndex
CREATE INDEX "student_payments_paymentMethod_idx" ON "student_payments"("paymentMethod");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_trxId_key" ON "subscription_payments"("trxId");

-- AddForeignKey
ALTER TABLE "hefz_daily_logs" ADD CONSTRAINT "hefz_daily_logs_hefzEnrollmentId_fkey" FOREIGN KEY ("hefzEnrollmentId") REFERENCES "hefz_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hefz_daily_logs" ADD CONSTRAINT "hefz_daily_logs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hefz_enrollments" ADD CONSTRAINT "hefz_enrollments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hefz_enrollments" ADD CONSTRAINT "hefz_enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hefz_enrollments" ADD CONSTRAINT "hefz_enrollments_ustadId_fkey" FOREIGN KEY ("ustadId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_payments" ADD CONSTRAINT "student_payments_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
