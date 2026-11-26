-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable: school_settings
ALTER TABLE "school_settings"
    ADD COLUMN IF NOT EXISTS "weeklyOffDays" INTEGER[] NOT NULL DEFAULT ARRAY[5]::INTEGER[];

-- CreateIndex: attendances composite index
CREATE INDEX IF NOT EXISTS "attendances_schoolId_date_idx" ON "attendances"("schoolId", "date");

-- CreateTable: school_holidays
CREATE TABLE IF NOT EXISTS "school_holidays" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_holidays_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "school_holidays_schoolId_date_key" ON "school_holidays"("schoolId", "date");
CREATE INDEX IF NOT EXISTS "school_holidays_schoolId_date_idx" ON "school_holidays"("schoolId", "date");

-- CreateTable: attendance_histories
CREATE TABLE IF NOT EXISTS "attendance_histories" (
    "id" SERIAL NOT NULL,
    "attendanceId" INTEGER NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "oldStatus" "AttendanceStatus",
    "newStatus" "AttendanceStatus" NOT NULL,
    "oldRemarks" TEXT,
    "newRemarks" TEXT,
    "changedBy" INTEGER NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_histories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "attendance_histories_attendanceId_idx" ON "attendance_histories"("attendanceId");
CREATE INDEX IF NOT EXISTS "attendance_histories_schoolId_changedAt_idx" ON "attendance_histories"("schoolId", "changedAt");

-- CreateTable: leave_requests
CREATE TABLE IF NOT EXISTS "leave_requests" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "requestedBy" INTEGER NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" INTEGER,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "leave_requests_schoolId_status_idx" ON "leave_requests"("schoolId", "status");
CREATE INDEX IF NOT EXISTS "leave_requests_schoolId_studentId_fromDate_toDate_idx" ON "leave_requests"("schoolId", "studentId", "fromDate", "toDate");

-- CreateTable: monthly_reports
CREATE TABLE IF NOT EXISTS "monthly_reports" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "classId" INTEGER NOT NULL,
    "sectionId" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "publishedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "monthly_reports_schoolId_month_classId_sectionId_key" ON "monthly_reports"("schoolId", "month", "classId", "sectionId");
CREATE INDEX IF NOT EXISTS "monthly_reports_schoolId_month_idx" ON "monthly_reports"("schoolId", "month");

-- AddForeignKeys
ALTER TABLE "school_holidays"
    ADD CONSTRAINT "school_holidays_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance_histories"
    ADD CONSTRAINT "attendance_histories_attendanceId_fkey"
    FOREIGN KEY ("attendanceId") REFERENCES "attendances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance_histories"
    ADD CONSTRAINT "attendance_histories_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance_histories"
    ADD CONSTRAINT "attendance_histories_changedBy_fkey"
    FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "leave_requests"
    ADD CONSTRAINT "leave_requests_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "leave_requests"
    ADD CONSTRAINT "leave_requests_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "leave_requests"
    ADD CONSTRAINT "leave_requests_requestedBy_fkey"
    FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "leave_requests"
    ADD CONSTRAINT "leave_requests_reviewedBy_fkey"
    FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "monthly_reports"
    ADD CONSTRAINT "monthly_reports_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "monthly_reports"
    ADD CONSTRAINT "monthly_reports_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "school_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "monthly_reports"
    ADD CONSTRAINT "monthly_reports_sectionId_fkey"
    FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "monthly_reports"
    ADD CONSTRAINT "monthly_reports_publishedBy_fkey"
    FOREIGN KEY ("publishedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
