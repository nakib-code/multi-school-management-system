/*
  Warnings:

  - A unique constraint covering the columns `[schoolId,employeeId]` on the table `teachers` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "teachers_employeeId_idx";

-- DropIndex
DROP INDEX "teachers_employeeId_key";

-- CreateIndex
CREATE UNIQUE INDEX "teachers_schoolId_employeeId_key" ON "teachers"("schoolId", "employeeId");
