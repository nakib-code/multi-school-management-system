-- CreateEnum
CREATE TYPE "IncomeEntryCategory" AS ENUM ('OTHER_INCOME');

-- CreateTable
CREATE TABLE "income_entries" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "category" "IncomeEntryCategory" NOT NULL DEFAULT 'OTHER_INCOME',
    "sourceLabel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "incomeDate" TIMESTAMP(3) NOT NULL,
    "billingMonth" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "referenceNo" TEXT,
    "notes" TEXT,
    "recordedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "income_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "income_entries_schoolId_billingMonth_idx" ON "income_entries"("schoolId", "billingMonth");

-- CreateIndex
CREATE INDEX "income_entries_schoolId_incomeDate_idx" ON "income_entries"("schoolId", "incomeDate");

-- AddForeignKey
ALTER TABLE "income_entries" ADD CONSTRAINT "income_entries_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_entries" ADD CONSTRAINT "income_entries_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
