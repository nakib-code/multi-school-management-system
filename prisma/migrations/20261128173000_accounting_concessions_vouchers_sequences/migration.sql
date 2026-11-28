-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'BANK_TRANSFER';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CHEQUE';

-- CreateEnum
CREATE TYPE "StudentConcessionType" AS ENUM ('ORPHAN', 'LILLAH', 'SIBLING', 'SCHOLARSHIP', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DiscountMode" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "SequenceDocumentType" AS ENUM ('FEE_RECEIPT', 'DONATION_RECEIPT', 'EXPENSE_VOUCHER');

-- AlterTable: students (concession / scholarship profile)
ALTER TABLE "students"
ADD COLUMN "concessionType" "StudentConcessionType",
ADD COLUMN "concessionMode" "DiscountMode",
ADD COLUMN "concessionValue" DECIMAL(10,2),
ADD COLUMN "concessionReason" TEXT;

-- AlterTable: student_fees (gross amount, concessions, partial waivers)
ALTER TABLE "student_fees"
ADD COLUMN "grossAmount" DECIMAL(10,2),
ADD COLUMN "concessionAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "concessionType" "StudentConcessionType",
ADD COLUMN "waivedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "waiverReason" TEXT,
ADD COLUMN "waivedById" INTEGER,
ADD COLUMN "waivedAt" TIMESTAMP(3);

-- AlterTable: student_payments (per-school sequential receiptNo)
ALTER TABLE "student_payments"
ADD COLUMN "receiptNo" TEXT;

-- AlterTable: income_entries (per-school sequential receiptNo)
ALTER TABLE "income_entries"
ADD COLUMN "receiptNo" TEXT;

-- AlterTable: custom_expense_entries (paymentMethod, sequential voucherNo, bill photo attachmentUrl)
ALTER TABLE "custom_expense_entries"
ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
ADD COLUMN "voucherNo" TEXT,
ADD COLUMN "attachmentUrl" TEXT;

-- CreateTable: school_document_sequences
CREATE TABLE "school_document_sequences" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "docType" "SequenceDocumentType" NOT NULL,
    "year" INTEGER NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_payments_schoolId_receiptNo_key" ON "student_payments"("schoolId", "receiptNo");
CREATE UNIQUE INDEX "income_entries_schoolId_receiptNo_key" ON "income_entries"("schoolId", "receiptNo");
CREATE UNIQUE INDEX "custom_expense_entries_schoolId_voucherNo_key" ON "custom_expense_entries"("schoolId", "voucherNo");
CREATE UNIQUE INDEX "school_document_sequences_schoolId_docType_year_key" ON "school_document_sequences"("schoolId", "docType", "year");

-- AddForeignKey
ALTER TABLE "student_fees" ADD CONSTRAINT "student_fees_waivedById_fkey" FOREIGN KEY ("waivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "school_document_sequences" ADD CONSTRAINT "school_document_sequences_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
