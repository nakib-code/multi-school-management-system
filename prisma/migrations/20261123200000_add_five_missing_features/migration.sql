-- Safe, additive migration for the 5 missing MadrasaOS features
-- (PasswordResetToken, Notification, ClassRoutine, PlatformAuditLog, UploadedFile)

CREATE TYPE "NotificationType" AS ENUM (
  'ADMISSION',
  'ENROLLMENT',
  'ATTENDANCE',
  'EXAM',
  'RESULT',
  'FEE',
  'PAYMENT',
  'SUBSCRIPTION',
  'ROUTINE',
  'ANNOUNCEMENT',
  'SYSTEM'
);

CREATE TYPE "DayOfWeek" AS ENUM (
  'SATURDAY',
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY'
);

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");
ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" SERIAL NOT NULL,
  "schoolId" INTEGER,
  "recipientId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
  "metadata" JSONB,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_recipientId_isRead_idx" ON "notifications"("recipientId", "isRead");
CREATE INDEX IF NOT EXISTS "notifications_schoolId_idx" ON "notifications"("schoolId");
CREATE INDEX IF NOT EXISTS "notifications_createdAt_idx" ON "notifications"("createdAt");
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "class_routines" (
  "id" SERIAL NOT NULL,
  "schoolId" INTEGER NOT NULL,
  "classId" INTEGER NOT NULL,
  "sectionId" INTEGER,
  "subjectId" INTEGER NOT NULL,
  "teacherId" INTEGER NOT NULL,
  "dayOfWeek" "DayOfWeek" NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "roomNumber" TEXT,
  "academicYear" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "class_routines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "class_routines_schoolId_academicYear_dayOfWeek_idx" ON "class_routines"("schoolId", "academicYear", "dayOfWeek");
CREATE INDEX IF NOT EXISTS "class_routines_schoolId_classId_sectionId_dayOfWeek_idx" ON "class_routines"("schoolId", "classId", "sectionId", "dayOfWeek");
CREATE INDEX IF NOT EXISTS "class_routines_schoolId_teacherId_dayOfWeek_idx" ON "class_routines"("schoolId", "teacherId", "dayOfWeek");
ALTER TABLE "class_routines"
  ADD CONSTRAINT "class_routines_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_routines"
  ADD CONSTRAINT "class_routines_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "school_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_routines"
  ADD CONSTRAINT "class_routines_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "class_routines"
  ADD CONSTRAINT "class_routines_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_routines"
  ADD CONSTRAINT "class_routines_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "platform_audit_logs" (
  "id" SERIAL NOT NULL,
  "actorId" INTEGER,
  "action" "AuditAction" NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "schoolId" INTEGER,
  "description" TEXT,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "platform_audit_logs_actorId_idx" ON "platform_audit_logs"("actorId");
CREATE INDEX IF NOT EXISTS "platform_audit_logs_action_idx" ON "platform_audit_logs"("action");
CREATE INDEX IF NOT EXISTS "platform_audit_logs_entityType_idx" ON "platform_audit_logs"("entityType");
CREATE INDEX IF NOT EXISTS "platform_audit_logs_schoolId_idx" ON "platform_audit_logs"("schoolId");
CREATE INDEX IF NOT EXISTS "platform_audit_logs_createdAt_idx" ON "platform_audit_logs"("createdAt");
ALTER TABLE "platform_audit_logs"
  ADD CONSTRAINT "platform_audit_logs_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "platform_audit_logs"
  ADD CONSTRAINT "platform_audit_logs_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "uploaded_files" (
  "id" SERIAL NOT NULL,
  "schoolId" INTEGER,
  "uploadedById" INTEGER NOT NULL,
  "publicId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL,
  "folder" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "uploaded_files_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uploaded_files_publicId_key" ON "uploaded_files"("publicId");
CREATE INDEX IF NOT EXISTS "uploaded_files_schoolId_idx" ON "uploaded_files"("schoolId");
CREATE INDEX IF NOT EXISTS "uploaded_files_uploadedById_idx" ON "uploaded_files"("uploadedById");
CREATE INDEX IF NOT EXISTS "uploaded_files_category_idx" ON "uploaded_files"("category");
ALTER TABLE "uploaded_files"
  ADD CONSTRAINT "uploaded_files_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "uploaded_files"
  ADD CONSTRAINT "uploaded_files_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
