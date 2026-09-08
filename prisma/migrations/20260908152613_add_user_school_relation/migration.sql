-- AlterTable
ALTER TABLE "users" ADD COLUMN     "schoolId" INTEGER;

-- CreateIndex
CREATE INDEX "users_schoolId_idx" ON "users"("schoolId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
