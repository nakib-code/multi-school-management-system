/*
  Warnings:

  - A unique constraint covering the columns `[subdomain]` on the table `schools` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[customDomain]` on the table `schools` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_sectionId_fkey";

-- AlterTable
ALTER TABLE "enrollments" ALTER COLUMN "sectionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "contactAddress" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "customDomain" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "domainVerificationToken" TEXT,
ADD COLUMN     "domainVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "facebookUrl" TEXT,
ADD COLUMN     "mapEmbedUrl" TEXT,
ADD COLUMN     "primaryColor" TEXT DEFAULT '#0F766E',
ADD COLUMN     "secondaryColor" TEXT DEFAULT '#F59E0B',
ADD COLUMN     "subdomain" TEXT,
ADD COLUMN     "tagline" TEXT,
ADD COLUMN     "youtubeUrl" TEXT;

-- CreateTable
CREATE TABLE "school_contact_messages" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_gallery_images" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_gallery_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_notices" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_page_contents" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_page_contents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "school_contact_messages_schoolId_isRead_idx" ON "school_contact_messages"("schoolId", "isRead");

-- CreateIndex
CREATE INDEX "school_gallery_images_schoolId_isPublic_idx" ON "school_gallery_images"("schoolId", "isPublic");

-- CreateIndex
CREATE INDEX "school_notices_schoolId_isPublic_publishedAt_idx" ON "school_notices"("schoolId", "isPublic", "publishedAt");

-- CreateIndex
CREATE INDEX "school_page_contents_schoolId_isPublished_idx" ON "school_page_contents"("schoolId", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "school_page_contents_schoolId_slug_key" ON "school_page_contents"("schoolId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "schools_subdomain_key" ON "schools"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "schools_customDomain_key" ON "schools"("customDomain");

-- CreateIndex
CREATE INDEX "schools_subdomain_idx" ON "schools"("subdomain");

-- CreateIndex
CREATE INDEX "schools_customDomain_idx" ON "schools"("customDomain");

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_contact_messages" ADD CONSTRAINT "school_contact_messages_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_gallery_images" ADD CONSTRAINT "school_gallery_images_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_notices" ADD CONSTRAINT "school_notices_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_page_contents" ADD CONSTRAINT "school_page_contents_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
