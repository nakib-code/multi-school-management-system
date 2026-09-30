-- CreateTable
CREATE TABLE "custom_package_request_features" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "feature" "PackageFeature" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_package_request_features_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_package_request_features_requestId_idx" ON "custom_package_request_features"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_package_request_features_requestId_feature_key" ON "custom_package_request_features"("requestId", "feature");

-- AddForeignKey
ALTER TABLE "custom_package_request_features" ADD CONSTRAINT "custom_package_request_features_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "custom_package_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
