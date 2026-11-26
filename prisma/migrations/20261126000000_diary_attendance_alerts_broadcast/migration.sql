-- Additive migration: diary_attendance_alerts_broadcast
-- Adds DIARY & EMERGENCY notification types and class_diaries table.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DIARY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EMERGENCY';

CREATE TABLE IF NOT EXISTS "class_diaries" (
  "id" SERIAL NOT NULL,
  "schoolId" INTEGER NOT NULL,
  "classId" INTEGER NOT NULL,
  "sectionId" INTEGER,
  "subjectId" INTEGER,
  "teacherId" INTEGER,
  "createdById" INTEGER NOT NULL,
  "diaryDate" TIMESTAMP(3) NOT NULL,
  "title" TEXT,
  "classwork" TEXT NOT NULL,
  "homework" TEXT,
  "dueDate" TIMESTAMP(3),
  "attachmentUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "class_diaries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "class_diaries_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "class_diaries_classId_fkey" FOREIGN KEY ("classId") REFERENCES "school_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "class_diaries_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "class_diaries_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "class_diaries_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "class_diaries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "class_diaries_schoolId_diaryDate_idx"
  ON "class_diaries"("schoolId", "diaryDate");

CREATE INDEX IF NOT EXISTS "class_diaries_schoolId_classId_sectionId_diaryDate_idx"
  ON "class_diaries"("schoolId", "classId", "sectionId", "diaryDate");
