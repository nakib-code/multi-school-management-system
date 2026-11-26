-- Additive migration: universal_admission_student_profile
-- Safe for existing data; all new profile columns are nullable or have defaults.

-- 1. Extend existing enums
ALTER TYPE "AdmissionPaymentMethod" ADD VALUE IF NOT EXISTS 'BKASH';
ALTER TYPE "AdmissionPaymentMethod" ADD VALUE IF NOT EXISTS 'NAGAD';
ALTER TYPE "AdmissionPaymentMethod" ADD VALUE IF NOT EXISTS 'ROCKET';

ALTER TYPE "HefzWing" ADD VALUE IF NOT EXISTS 'NOORANI';
ALTER TYPE "HefzWing" ADD VALUE IF NOT EXISTS 'QAIDA';
ALTER TYPE "HefzWing" ADD VALUE IF NOT EXISTS 'AMPARA';

-- 2. Create new enums
DO $$ BEGIN
  CREATE TYPE "ResidentialType" AS ENUM ('NON_RESIDENTIAL', 'RESIDENTIAL', 'DAY_CARE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AcademicGroup" AS ENUM ('SCIENCE', 'ARTS', 'COMMERCE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Admissions table updates (make studentEmail & passwordHash optional + add Stage 1 & 2 fields)
ALTER TABLE "admissions"
  ALTER COLUMN "studentEmail" DROP NOT NULL,
  ALTER COLUMN "passwordHash" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "nameBangla" TEXT,
  ADD COLUMN IF NOT EXISTS "birthRegNo" TEXT,
  ADD COLUMN IF NOT EXISTS "residentialType" "ResidentialType" NOT NULL DEFAULT 'NON_RESIDENTIAL',
  ADD COLUMN IF NOT EXISTS "fatherName" TEXT,
  ADD COLUMN IF NOT EXISTS "motherName" TEXT,
  ADD COLUMN IF NOT EXISTS "presentAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "permanentAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "academicGroup" "AcademicGroup",
  ADD COLUMN IF NOT EXISTS "quranWing" "HefzWing",
  ADD COLUMN IF NOT EXISTS "guardianNidUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "previousTcUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "marksheetUrl" TEXT;

-- 4. Students table updates (Stage 1 & Stage 2 Progressive Profile)
ALTER TABLE "students"
  ADD COLUMN IF NOT EXISTS "nameBangla" TEXT,
  ADD COLUMN IF NOT EXISTS "residentialType" "ResidentialType" NOT NULL DEFAULT 'NON_RESIDENTIAL',
  ADD COLUMN IF NOT EXISTS "shift" TEXT,
  ADD COLUMN IF NOT EXISTS "quranWing" "HefzWing",
  ADD COLUMN IF NOT EXISTS "birthRegNo" TEXT,
  ADD COLUMN IF NOT EXISTS "bloodGroup" TEXT,
  ADD COLUMN IF NOT EXISTS "religion" TEXT,
  ADD COLUMN IF NOT EXISTS "nationality" TEXT,
  ADD COLUMN IF NOT EXISTS "studentPhotoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "fatherName" TEXT,
  ADD COLUMN IF NOT EXISTS "fatherPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "fatherOccupation" TEXT,
  ADD COLUMN IF NOT EXISTS "fatherNid" TEXT,
  ADD COLUMN IF NOT EXISTS "motherName" TEXT,
  ADD COLUMN IF NOT EXISTS "motherPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "motherOccupation" TEXT,
  ADD COLUMN IF NOT EXISTS "motherNid" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyContactName" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyContactPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "presentAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "permanentAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "authorizedPickupName" TEXT,
  ADD COLUMN IF NOT EXISTS "authorizedPickupRelation" TEXT,
  ADD COLUMN IF NOT EXISTS "authorizedPickupPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "authorizedPickupNid" TEXT,
  ADD COLUMN IF NOT EXISTS "pickupPersonPhotoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "academicGroup" "AcademicGroup",
  ADD COLUMN IF NOT EXISTS "boardName" TEXT,
  ADD COLUMN IF NOT EXISTS "boardRollNo" TEXT,
  ADD COLUMN IF NOT EXISTS "boardRegNo" TEXT,
  ADD COLUMN IF NOT EXISTS "fourthSubject" TEXT,
  ADD COLUMN IF NOT EXISTS "previousSchool" TEXT,
  ADD COLUMN IF NOT EXISTS "previousClass" TEXT,
  ADD COLUMN IF NOT EXISTS "tcNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "tcDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "allergies" TEXT,
  ADD COLUMN IF NOT EXISTS "medicalConditions" TEXT,
  ADD COLUMN IF NOT EXISTS "medications" TEXT,
  ADD COLUMN IF NOT EXISTS "healthNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "birthCertificateUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "guardianNidUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "previousTcUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "marksheetUrl" TEXT;

-- 5. Enrollments table updates
ALTER TABLE "enrollments"
  ADD COLUMN IF NOT EXISTS "shift" TEXT,
  ADD COLUMN IF NOT EXISTS "academicGroup" "AcademicGroup",
  ADD COLUMN IF NOT EXISTS "boardName" TEXT,
  ADD COLUMN IF NOT EXISTS "boardRollNo" TEXT,
  ADD COLUMN IF NOT EXISTS "boardRegNo" TEXT,
  ADD COLUMN IF NOT EXISTS "fourthSubject" TEXT;

-- 6. Guardians table updates
ALTER TABLE "guardians"
  ADD COLUMN IF NOT EXISTS "nid" TEXT;
