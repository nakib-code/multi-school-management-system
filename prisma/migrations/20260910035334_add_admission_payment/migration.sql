-- CreateEnum
CREATE TYPE "AdmissionPaymentMethod" AS ENUM ('CASH', 'ONLINE');

-- CreateEnum
CREATE TYPE "AdmissionPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "admission_payments" (
    "id" SERIAL NOT NULL,
    "admissionId" INTEGER NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "AdmissionPaymentMethod" NOT NULL,
    "status" "AdmissionPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "receivedBy" INTEGER,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admission_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admission_payments_admissionId_key" ON "admission_payments"("admissionId");

-- CreateIndex
CREATE UNIQUE INDEX "admission_payments_transactionId_key" ON "admission_payments"("transactionId");

-- CreateIndex
CREATE INDEX "admission_payments_schoolId_idx" ON "admission_payments"("schoolId");

-- CreateIndex
CREATE INDEX "admission_payments_status_idx" ON "admission_payments"("status");

-- CreateIndex
CREATE INDEX "admission_payments_paymentMethod_idx" ON "admission_payments"("paymentMethod");

-- AddForeignKey
ALTER TABLE "admission_payments" ADD CONSTRAINT "admission_payments_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_payments" ADD CONSTRAINT "admission_payments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_payments" ADD CONSTRAINT "admission_payments_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
