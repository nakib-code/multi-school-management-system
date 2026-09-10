import bcrypt from "bcrypt";

import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";

import type { CreateTeacherInput } from "./interface.js";

import {
  generateVerificationCode,
  saveVerificationCode,
  getVerificationCode,
  deleteVerificationCode,
} from "../../utils/verificationCode.js";

import { sendVerificationEmail } from "../../utils/sendEmail.js";

export const createTeacher = async (
  input: CreateTeacherInput,
) => {
  const {
    schoolId,
    name,
    email,
    password,
    employeeId,
    firstName,
    lastName,
    phone,
    address,
    dateOfBirth,
    joiningDate,
    designation,
    qualification,
  } = input;

  const normalizedEmail = email.trim().toLowerCase();

  // Check school
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
      "Teacher cannot be created for an inactive school",
    );
  }

  // Check existing user email
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

  // Check employee ID inside this school
  const existingTeacher = await prisma.teacher.findFirst({
    where: {
      schoolId,
      employeeId,
    },
  });

  if (existingTeacher) {
    throw new AppError(
      409,
      "Employee ID already exists in this school",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,

        role: "TEACHER",

        // Teacher must verify email first
        status: "PENDING",

        mustChangePassword: false,
        schoolId,
      },
    });

    const teacher = await tx.teacher.create({
      data: {
        userId: user.id,
        schoolId,
        employeeId,

        firstName,
        lastName,
        phone,
        address,

        dateOfBirth: dateOfBirth
          ? new Date(dateOfBirth)
          : undefined,

        joiningDate: joiningDate
          ? new Date(joiningDate)
          : undefined,

        designation,
        qualification,
      },

      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        dateOfBirth: true,
        joiningDate: true,
        designation: true,
        qualification: true,
        isActive: true,

        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            schoolId: true,
          },
        },
      },
    });

    return teacher;
  });

  // Generate verification code
  const verificationCode = generateVerificationCode();

  // Save code in Redis
  await saveVerificationCode(
    normalizedEmail,
    verificationCode,
  );

  // Send verification email
  try {
    await sendVerificationEmail(
      normalizedEmail,
      verificationCode,
    );
  } catch (error) {
    console.error(
      "Failed to send teacher verification email:",
      error,
    );

    // Remove Redis code
    await deleteVerificationCode(normalizedEmail);

    // Remove created teacher/user
    await prisma.teacher.delete({
      where: {
        id: result.id,
      },
    });

    await prisma.user.delete({
      where: {
        id: result.user.id,
      },
    });

    throw new AppError(
      500,
      "Teacher account could not be created because verification email failed",
    );
  }

  return {
    id: result.id,
    employeeId: result.employeeId,
    firstName: result.firstName,
    lastName: result.lastName,
    email: result.user.email,
    role: result.user.role,
    status: result.user.status,
    emailVerified: false,
  };
};


export const verifyTeacherEmail = async (
  schoolId: number,
  teacherId: number,
  code: string,
) => {
  const teacher = await prisma.teacher.findFirst({
    where: {
      id: teacherId,
      schoolId,
    },

    select: {
      id: true,
      employeeId: true,
      userId: true,

      user: {
        select: {
          id: true,
          email: true,
          status: true,
          role: true,
          schoolId: true,
        },
      },
    },
  });

  if (!teacher) {
    throw new AppError(404, "Teacher not found");
  }

  if (teacher.user.status === "ACTIVE") {
    throw new AppError(
      400,
      "Teacher email is already verified",
    );
  }

  if (teacher.user.status !== "PENDING") {
    throw new AppError(
      400,
      "Teacher account cannot be verified",
    );
  }

  const verificationCode = await getVerificationCode(
    teacher.user.email,
  );

  if (!verificationCode) {
    throw new AppError(
      400,
      "Verification code has expired or does not exist",
    );
  }

  if (verificationCode !== code) {
    throw new AppError(
      400,
      "Invalid verification code",
    );
  }

  const updatedTeacher = await prisma.user.update({
    where: {
      id: teacher.userId,
    },

    data: {
      // Verification successful
      status: "ACTIVE",
    },

    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      schoolId: true,
    },
  });

  // Delete OTP after successful verification
  await deleteVerificationCode(
    teacher.user.email,
  );

  return {
    teacherId: teacher.id,
    employeeId: teacher.employeeId,
    email: updatedTeacher.email,
    emailVerified: true,
    status: updatedTeacher.status,
  };
};