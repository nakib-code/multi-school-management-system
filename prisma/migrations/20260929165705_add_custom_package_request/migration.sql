-- CreateEnum
CREATE TYPE "CustomPackageRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "custom_package_requests" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "requestedStudentLimit" INTEGER NOT NULL,
    "requestedPrice" DECIMAL(10,2) NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'CUSTOM',
    "description" TEXT,
    "status" "CustomPackageRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_package_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_package_requests_schoolId_idx" ON "custom_package_requests"("schoolId");

-- CreateIndex
CREATE INDEX "custom_package_requests_status_idx" ON "custom_package_requests"("status");

-- CreateIndex
CREATE INDEX "custom_package_requests_createdAt_idx" ON "custom_package_requests"("createdAt");

-- AddForeignKey
ALTER TABLE "custom_package_requests" ADD CONSTRAINT "custom_package_requests_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
