/*
  Warnings:

  - Added the required column `academicYear` to the `admissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `classId` to the `admissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sectionId` to the `admissions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "admissions" ADD COLUMN     "academicYear" TEXT NOT NULL,
ADD COLUMN     "birthCertificateUrl" TEXT,
ADD COLUMN     "bloodGroup" TEXT,
ADD COLUMN     "classId" INTEGER NOT NULL,
ADD COLUMN     "group" TEXT,
ADD COLUMN     "guardianEmail" TEXT,
ADD COLUMN     "guardianNid" TEXT,
ADD COLUMN     "guardianOccupation" TEXT,
ADD COLUMN     "guardianRelationship" TEXT,
ADD COLUMN     "previousCertificateUrl" TEXT,
ADD COLUMN     "previousClass" TEXT,
ADD COLUMN     "sectionId" INTEGER NOT NULL,
ADD COLUMN     "shift" TEXT,
ADD COLUMN     "studentPhotoUrl" TEXT;

-- CreateIndex
CREATE INDEX "admissions_classId_idx" ON "admissions"("classId");

-- CreateIndex
CREATE INDEX "admissions_sectionId_idx" ON "admissions"("sectionId");

-- CreateIndex
CREATE INDEX "admissions_academicYear_idx" ON "admissions"("academicYear");

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_classId_fkey" FOREIGN KEY ("classId") REFERENCES "school_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
