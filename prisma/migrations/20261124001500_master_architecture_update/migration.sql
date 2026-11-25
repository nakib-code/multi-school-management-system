-- CreateEnum
CREATE TYPE "MobileAccountType" AS ENUM ('PERSONAL', 'MERCHANT', 'AGENT');

-- AlterTable school_settings: add feature flags & mobile banking types/instruction
ALTER TABLE "school_settings"
  ALTER COLUMN "admissionFee" SET DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "hasGeneralSection" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "hasHefzSection" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "hasPublicWebsite" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "hasOnlineAdmission" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "hasTeacherPayroll" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "bkashType" "MobileAccountType" NOT NULL DEFAULT 'PERSONAL',
  ADD COLUMN IF NOT EXISTS "nagadType" "MobileAccountType" NOT NULL DEFAULT 'PERSONAL',
  ADD COLUMN IF NOT EXISTS "rocketType" "MobileAccountType" NOT NULL DEFAULT 'PERSONAL',
  ADD COLUMN IF NOT EXISTS "feePaymentInstruction" TEXT;

-- CreateTable platform_settings
CREATE TABLE IF NOT EXISTS "platform_settings" (
  "id" SERIAL NOT NULL,
  "platformName" TEXT NOT NULL DEFAULT 'MadrasaOS',
  "supportPhone" TEXT,
  "bkashNumber" TEXT,
  "bkashType" "MobileAccountType" NOT NULL DEFAULT 'PERSONAL',
  "nagadNumber" TEXT,
  "nagadType" "MobileAccountType" NOT NULL DEFAULT 'PERSONAL',
  "rocketNumber" TEXT,
  "rocketType" "MobileAccountType" NOT NULL DEFAULT 'PERSONAL',
  "paymentInstruction" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- AlterTable students: make userId optional (no mandatory student login)
ALTER TABLE "students" ALTER COLUMN "userId" DROP NOT NULL;
