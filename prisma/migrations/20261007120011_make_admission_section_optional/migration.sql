-- DropForeignKey
ALTER TABLE "admissions" DROP CONSTRAINT "admissions_sectionId_fkey";

-- AlterTable
ALTER TABLE "admissions" ALTER COLUMN "sectionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
