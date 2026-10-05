-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "selectedPackageId" INTEGER;

-- CreateIndex
CREATE INDEX "schools_selectedPackageId_idx" ON "schools"("selectedPackageId");

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_selectedPackageId_fkey" FOREIGN KEY ("selectedPackageId") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
