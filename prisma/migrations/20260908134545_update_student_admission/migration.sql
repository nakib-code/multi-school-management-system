/*
  Warnings:

  - You are about to drop the column `guardianEmail` on the `admissions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `students` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `studentEmail` to the `admissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `students` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'STUDENT';

-- AlterTable
ALTER TABLE "admissions" DROP COLUMN "guardianEmail",
ADD COLUMN     "studentEmail" TEXT NOT NULL,
ALTER COLUMN "guardianName" DROP NOT NULL,
ALTER COLUMN "guardianPhone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "role" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "admissions_studentEmail_idx" ON "admissions"("studentEmail");

-- CreateIndex
CREATE UNIQUE INDEX "students_userId_key" ON "students"("userId");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
