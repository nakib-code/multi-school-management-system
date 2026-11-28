-- CreateEnum
CREATE TYPE "CustomExpenseFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE');

-- CreateTable
CREATE TABLE "custom_expense_sheets" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_expense_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_expense_fields" (
    "id" SERIAL NOT NULL,
    "sheetId" INTEGER NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldType" "CustomExpenseFieldType" NOT NULL DEFAULT 'TEXT',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_expense_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_expense_entries" (
    "id" SERIAL NOT NULL,
    "sheetId" INTEGER NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "billingMonth" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "fieldValues" JSONB NOT NULL DEFAULT '{}',
    "recordedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_expense_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_expense_sheets_schoolId_isActive_idx" ON "custom_expense_sheets"("schoolId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "custom_expense_sheets_schoolId_name_key" ON "custom_expense_sheets"("schoolId", "name");

-- CreateIndex
CREATE INDEX "custom_expense_fields_schoolId_sheetId_sortOrder_idx" ON "custom_expense_fields"("schoolId", "sheetId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "custom_expense_fields_sheetId_fieldKey_key" ON "custom_expense_fields"("sheetId", "fieldKey");

-- CreateIndex
CREATE INDEX "custom_expense_entries_schoolId_sheetId_billingMonth_idx" ON "custom_expense_entries"("schoolId", "sheetId", "billingMonth");

-- CreateIndex
CREATE INDEX "custom_expense_entries_schoolId_sheetId_entryDate_idx" ON "custom_expense_entries"("schoolId", "sheetId", "entryDate");

-- AddForeignKey
ALTER TABLE "custom_expense_sheets" ADD CONSTRAINT "custom_expense_sheets_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_expense_sheets" ADD CONSTRAINT "custom_expense_sheets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_expense_fields" ADD CONSTRAINT "custom_expense_fields_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "custom_expense_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_expense_fields" ADD CONSTRAINT "custom_expense_fields_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_expense_entries" ADD CONSTRAINT "custom_expense_entries_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "custom_expense_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_expense_entries" ADD CONSTRAINT "custom_expense_entries_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_expense_entries" ADD CONSTRAINT "custom_expense_entries_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
