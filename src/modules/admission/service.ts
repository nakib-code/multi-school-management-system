import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import { hashPassword } from "../../utils/password.js";

import {
  generateVerificationCode,
  saveVerificationCode,
  getVerificationCode,
  deleteVerificationCode,
} from "../../utils/verificationCode.js";

import { sendVerificationEmail } from "../../utils/sendEmail.js";

import type {
  CreateAdmissionInput,
  VerifyStudentEmailInput,
} from "./interface.js";


// ======================================================
// CREATE ADMISSION
// ======================================================

export const createAdmission = async (
  payload: CreateAdmissionInput,
) => {
  const {
    schoolId,
    studentName,
    studentEmail,
    password,
    dateOfBirth,
    gender,
    guardianName,
    guardianPhone,
    previousSchool,
    address,
  } = payload;


  // ----------------------------------------------------
  // Check school
  // ----------------------------------------------------

  const school = await prisma.school.findUnique({
    where: {
      id: schoolId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!school) {
    throw new AppError(404, "School not found");
  }

  if (school.status !== "ACTIVE") {
    throw new AppError(
      400,
      "Admission is not available for this school",
    );
  }


  // ----------------------------------------------------
  // Normalize email
  // ----------------------------------------------------

  const normalizedEmail = studentEmail
    .trim()
    .toLowerCase();


  // ----------------------------------------------------
  // Check existing user
  // ----------------------------------------------------

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (existingUser) {
    throw new AppError(
      409,
      "A user with this email already exists",
    );
  }


  // ----------------------------------------------------
  // Check pending admission
  // ----------------------------------------------------

  const existingAdmission =
    await prisma.admission.findFirst({
      where: {
        schoolId,
        studentEmail: normalizedEmail,
        status: "PENDING",
      },
    });

  if (existingAdmission) {
    throw new AppError(
      409,
      "A pending admission already exists for this email",
    );
  }


  // ----------------------------------------------------
  // Hash password
  // ----------------------------------------------------

  const passwordHash = await hashPassword(password);


  // ----------------------------------------------------
  // Generate application number
  // ----------------------------------------------------

  const applicationNo = `ADM-${Date.now()}-${Math.floor(
    1000 + Math.random() * 9000,
  )}`;


  // ----------------------------------------------------
  // Create admission
  // ----------------------------------------------------

  const admission = await prisma.admission.create({
    data: {
      schoolId,
      applicationNo,

      studentName,
      studentEmail: normalizedEmail,

      passwordHash,

      dateOfBirth: dateOfBirth
        ? new Date(dateOfBirth)
        : undefined,

      gender,

      guardianName,
      guardianPhone,

      previousSchool,
      address,

      status: "PENDING",
    },
  });


  // ----------------------------------------------------
  // Generate verification code
  // ----------------------------------------------------

  const verificationCode =
    generateVerificationCode();


  // ----------------------------------------------------
  // Save verification code to Redis
  // ----------------------------------------------------

  await saveVerificationCode(
    normalizedEmail,
    verificationCode,
  );


  // ----------------------------------------------------
  // Send verification email
  // ----------------------------------------------------

  try {
    await sendVerificationEmail(
      normalizedEmail,
      verificationCode,
    );
  } catch (error) {
    // Delete OTP from Redis
    await deleteVerificationCode(
      normalizedEmail,
    );

    // Delete admission if email sending fails
    await prisma.admission.delete({
      where: {
        id: admission.id,
      },
    });

    throw new AppError(
      500,
      "Failed to send verification email",
    );
  }


  // ----------------------------------------------------
  // Response
  // ----------------------------------------------------

  return {
    id: admission.id,

    schoolId: admission.schoolId,

    applicationNo: admission.applicationNo,

    studentName: admission.studentName,

    studentEmail: admission.studentEmail,

    status: admission.status,

    emailVerified:
      admission.studentEmailVerified,

    createdAt: admission.createdAt,
  };
};


// ======================================================
// VERIFY STUDENT EMAIL
// ======================================================

export const verifyStudentEmail = async (
  payload: VerifyStudentEmailInput,
) => {
  const {
    email,
    code,
  } = payload;


  // ----------------------------------------------------
  // Normalize email
  // ----------------------------------------------------

  const normalizedEmail = email
    .trim()
    .toLowerCase();


  // ----------------------------------------------------
  // Find pending admission
  // ----------------------------------------------------

  const admission =
    await prisma.admission.findFirst({
      where: {
        studentEmail: normalizedEmail,
        status: "PENDING",
      },
    });

  if (!admission) {
    throw new AppError(
      404,
      "Pending admission not found",
    );
  }


  // ----------------------------------------------------
  // Check already verified
  // ----------------------------------------------------

  if (admission.studentEmailVerified) {
    throw new AppError(
      400,
      "Student email is already verified",
    );
  }


  // ----------------------------------------------------
  // Get OTP from Redis
  // ----------------------------------------------------

  const savedCode =
    await getVerificationCode(
      normalizedEmail,
    );

  if (!savedCode) {
    throw new AppError(
      400,
      "Verification code has expired or is invalid",
    );
  }


  // ----------------------------------------------------
  // Compare OTP
  // ----------------------------------------------------

  if (savedCode !== code) {
    throw new AppError(
      400,
      "Invalid verification code",
    );
  }


  // ----------------------------------------------------
  // Mark email as verified
  // ----------------------------------------------------

  const updatedAdmission =
    await prisma.admission.update({
      where: {
        id: admission.id,
      },
      data: {
        studentEmailVerified: true,
      },
    });


  // ----------------------------------------------------
  // Delete OTP from Redis
  // ----------------------------------------------------

  await deleteVerificationCode(
    normalizedEmail,
  );


  // ----------------------------------------------------
  // Response
  // ----------------------------------------------------

  return {
    admissionId: updatedAdmission.id,

    applicationNo:
      updatedAdmission.applicationNo,

    studentEmail:
      updatedAdmission.studentEmail,

    emailVerified:
      updatedAdmission.studentEmailVerified,
  };
};



export const getAdmissionById = async (
  schoolId: number,
  admissionId: number,
) => {
  const admission = await prisma.admission.findFirst({
    where: {
      id: admissionId,
      schoolId,
    },
    select: {
      id: true,
      schoolId: true,
      applicationNo: true,

      studentName: true,
      studentEmail: true,

      dateOfBirth: true,
      gender: true,

      guardianName: true,
      guardianPhone: true,

      previousSchool: true,
      address: true,

      studentEmailVerified: true,

      status: true,
      reviewedAt: true,
      reviewedBy: true,
      rejectionReason: true,

      createdAt: true,
      updatedAt: true,
    },
  });

  if (!admission) {
    throw new AppError(
      404,
      "Admission not found",
    );
  }

  return admission;
};
// ======================================================
// APPROVE ADMISSION
// ======================================================

export const approveAdmission = async (
  schoolId: number,
  admissionId: number,
  reviewerId: number,
) => {
  // Find admission
  const admission = await prisma.admission.findFirst({
    where: {
      id: admissionId,
      schoolId,
    },
  });

  if (!admission) {
    throw new AppError(
      404,
      "Admission not found",
    );
  }

  // Must be pending
  if (admission.status !== "PENDING") {
    throw new AppError(
      400,
      "Only pending admissions can be approved",
    );
  }

  // Email must be verified
  if (!admission.studentEmailVerified) {
    throw new AppError(
      400,
      "Student email must be verified before approval",
    );
  }

  // Make sure email is not already used
  const existingUser = await prisma.user.findUnique({
    where: {
      email: admission.studentEmail,
    },
  });

  if (existingUser) {
    throw new AppError(
      409,
      "A user with this email already exists",
    );
  }

  // Generate unique Student ID
  const studentId = `STU-${schoolId}-${Date.now()}-${Math.floor(
    1000 + Math.random() * 9000,
  )}`;

  // Split student name
  const nameParts = admission.studentName
    .trim()
    .split(/\s+/);

  const firstName = nameParts[0];

  const lastName =
    nameParts.length > 1
      ? nameParts.slice(1).join(" ")
      : null;

  // Create everything in one transaction
  const result = await prisma.$transaction(
    async (tx) => {
      // Create Student User
      const user = await tx.user.create({
        data: {
          name: admission.studentName,
          email: admission.studentEmail,
          passwordHash: admission.passwordHash,

          role: "STUDENT",
          status: "ACTIVE",

          mustChangePassword: false,

          schoolId,
        },
      });

      // Create Student profile
      const student = await tx.student.create({
        data: {
          userId: user.id,
          schoolId,

          studentId,

          firstName,
          lastName,

          dateOfBirth: admission.dateOfBirth,
          gender: admission.gender,

          admissionDate: new Date(),

          isActive: true,
        },
      });

      // Update admission
      const updatedAdmission =
        await tx.admission.update({
          where: {
            id: admission.id,
          },
          data: {
            status: "APPROVED",
            reviewedAt: new Date(),
            reviewedBy: reviewerId,
          },
        });

      return {
        admission: updatedAdmission,
        user,
        student,
      };
    },
  );

  return {
    admissionId: result.admission.id,

    applicationNo:
      result.admission.applicationNo,

    studentId: result.student.studentId,

    studentName: result.admission.studentName,

    studentEmail: result.user.email,

    status: result.admission.status,

    reviewedAt:
      result.admission.reviewedAt,
  };
};

export const rejectAdmission = async (
  schoolId: number,
  admissionId: number,
  reviewerId: number,
  rejectionReason: string,
) => {
  const admission = await prisma.admission.findFirst({
    where: {
      id: admissionId,
      schoolId,
    },
  });

  if (!admission) {
    throw new AppError(404, "Admission not found");
  }

  if (admission.status !== "PENDING") {
    throw new AppError(
      400,
      "Only pending admissions can be rejected",
    );
  }

  if (!admission.studentEmailVerified) {
    throw new AppError(
      400,
      "Student email must be verified before rejection",
    );
  }

  const updatedAdmission = await prisma.admission.update({
    where: {
      id: admissionId,
    },
    data: {
      status: "REJECTED",
      rejectionReason,
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
    },
    select: {
      id: true,
      applicationNo: true,
      studentName: true,
      studentEmail: true,
      status: true,
      rejectionReason: true,
      reviewedAt: true,
      reviewedBy: true,
    },
  });

  return updatedAdmission;
};