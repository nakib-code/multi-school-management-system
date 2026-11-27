-- AlterEnum
ALTER TYPE "FeeType" ADD VALUE IF NOT EXISTS 'SESSION';
ALTER TYPE "FeeType" ADD VALUE IF NOT EXISTS 'LAB';

-- AlterTable: admissions
ALTER TABLE "admissions"
ADD COLUMN IF NOT EXISTS "approvedStudentId" INTEGER,
ADD COLUMN IF NOT EXISTS "approvedEnrollmentId" INTEGER;

-- AlterTable: admission_payments
ALTER TABLE "admission_payments"
ADD COLUMN IF NOT EXISTS "senderNumber" TEXT;

-- AlterTable: student_fees
ALTER TABLE "student_fees"
ADD COLUMN IF NOT EXISTS "academicYear" TEXT,
ADD COLUMN IF NOT EXISTS "billingMonth" TEXT,
ADD COLUMN IF NOT EXISTS "examId" INTEGER,
ADD COLUMN IF NOT EXISTS "admissionPaymentId" INTEGER;

-- CreateTable: class_fee_structures
CREATE TABLE IF NOT EXISTS "class_fee_structures" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "feeType" "FeeType" NOT NULL,
    "title" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "academicYear" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_fee_structures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "class_fee_structures_schoolId_idx" ON "class_fee_structures"("schoolId");
CREATE INDEX IF NOT EXISTS "class_fee_structures_classId_idx" ON "class_fee_structures"("classId");
CREATE INDEX IF NOT EXISTS "class_fee_structures_schoolId_classId_feeType_idx" ON "class_fee_structures"("schoolId", "classId", "feeType");
CREATE UNIQUE INDEX IF NOT EXISTS "class_fee_structures_schoolId_classId_feeType_academicYear_key" ON "class_fee_structures"("schoolId", "classId", "feeType", "academicYear");

CREATE INDEX IF NOT EXISTS "admissions_approvedStudentId_idx" ON "admissions"("approvedStudentId");
CREATE INDEX IF NOT EXISTS "admissions_approvedEnrollmentId_idx" ON "admissions"("approvedEnrollmentId");

CREATE UNIQUE INDEX IF NOT EXISTS "student_fees_admissionPaymentId_key" ON "student_fees"("admissionPaymentId");
CREATE INDEX IF NOT EXISTS "student_fees_schoolId_feeType_academicYear_idx" ON "student_fees"("schoolId", "feeType", "academicYear");
CREATE INDEX IF NOT EXISTS "student_fees_schoolId_billingMonth_idx" ON "student_fees"("schoolId", "billingMonth");
CREATE INDEX IF NOT EXISTS "student_fees_examId_idx" ON "student_fees"("examId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_fee_structures_schoolId_fkey') THEN
        ALTER TABLE "class_fee_structures" ADD CONSTRAINT "class_fee_structures_schoolId_fkey"
        FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_fee_structures_classId_fkey') THEN
        ALTER TABLE "class_fee_structures" ADD CONSTRAINT "class_fee_structures_classId_fkey"
        FOREIGN KEY ("classId") REFERENCES "school_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_fees_examId_fkey') THEN
        ALTER TABLE "student_fees" ADD CONSTRAINT "student_fees_examId_fkey"
        FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_fees_admissionPaymentId_fkey') THEN
        ALTER TABLE "student_fees" ADD CONSTRAINT "student_fees_admissionPaymentId_fkey"
        FOREIGN KEY ("admissionPaymentId") REFERENCES "admission_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
