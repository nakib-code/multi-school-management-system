import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import { hashPassword } from "../../utils/password.js";
import {
  deleteVerificationCode,
  generateVerificationCode,
  getVerificationCode,
  saveVerificationCode,
} from "../../utils/verificationCode.js";
import { sendVerificationEmail } from "../../utils/sendEmail.js";
import type { CreateSchoolInput, VerifyAdminEmailInput } from "./interface.js";

export const createSchool = async (
  payload: CreateSchoolInput,
) => {
  const {
    name,
    code,
    email,
    phone,
    address,
    logo,
    adminName,
    adminEmail,
    adminPhone,
    adminPassword,
  } = payload;

  // Check school code
  const existingSchool = await prisma.school.findUnique({
    where: { code },
  });

  if (existingSchool) {
    throw new AppError(
      409,
      "A school with this code already exists",
    );
  }

  // Check admin email
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    throw new AppError(
      409,
      "A user with this admin email already exists",
    );
  }

  // Hash admin password
  const adminPasswordHash = await hashPassword(adminPassword);

  // Generate email verification code
  const verificationCode = generateVerificationCode();

  // Save verification code in Redis
  await saveVerificationCode(
    adminEmail,
    verificationCode,
  );

  // Create school as PENDING
  const school = await prisma.school.create({
    data: {
      name,
      code,
      email,
      phone,
      address,
      logo,

      status: "PENDING",

      adminName,
      adminEmail,
      adminPhone,
      adminPasswordHash,

      adminEmailVerified: false,
    },
  });

  // Send verification email
  try {
    await sendVerificationEmail(
      adminEmail,
      verificationCode,
    );
  } catch (error) {
    // Remove Redis code if email sending fails
    await saveVerificationCode(adminEmail, "");

    // Remove created school
    await prisma.school.delete({
      where: {
        id: school.id,
      },
    });

    console.error(
      "Failed to send verification email:",
      error,
    );

    throw new AppError(
      500,
      "Failed to send verification email",
    );
  }

  return {
    school: {
      id: school.id,
      name: school.name,
      code: school.code,
      email: school.email,
      phone: school.phone,
      address: school.address,
      logo: school.logo,
      status: school.status,
    },

    admin: {
      name: school.adminName,
      email: school.adminEmail,
      phone: school.adminPhone,
      emailVerified: school.adminEmailVerified,
    },

    message:
      "School registration submitted. Please verify the admin email.",
  };
};

export const approveSchool = async (
  schoolId: number,
  reviewerId: number,
) => {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
  });

  if (!school) {
    throw new AppError(404, "School not found");
  }

  if (school.status !== "PENDING") {
    throw new AppError(
      400,
      `School cannot be approved from ${school.status} status`,
    );
  }

  if (
    !school.adminEmail ||
    !school.adminName ||
    !school.adminPasswordHash
  ) {
    throw new AppError(
      400,
      "School admin information is incomplete",
    );
  }

  // Admin email must be verified
  if (!school.adminEmailVerified) {
    throw new AppError(
      400,
      "Admin email must be verified before school approval",
    );
  }

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: {
      email: school.adminEmail,
    },
  });

  if (existingAdmin) {
    throw new AppError(
      409,
      "A user with this admin email already exists",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // Activate school
    const updatedSchool = await tx.school.update({
      where: {
        id: schoolId,
      },
      data: {
        status: "ACTIVE",
      },
    });

    // Create Admin using registration password
    const admin = await tx.user.create({
      data: {
        name: school.adminName,
        email: school.adminEmail,
        phone: school.adminPhone,

        passwordHash: school.adminPasswordHash,

        role: "ADMIN",
        status: "ACTIVE",
        mustChangePassword: false,

        schoolId,
      },
    });

    return {
      school: updatedSchool,
      admin,
    };
  });

  return {
    school: result.school,

    admin: {
      id: result.admin.id,
      name: result.admin.name,
      email: result.admin.email,
      phone: result.admin.phone,
      role: result.admin.role,
      schoolId: result.admin.schoolId,
      mustChangePassword:
        result.admin.mustChangePassword,
    },
  };
};


export const verifyAdminEmail = async (
  payload: VerifyAdminEmailInput,
) => {
  const { email, code } = payload;

  // Find school by admin email
  const school = await prisma.school.findFirst({
    where: {
      adminEmail: email,
      status: "PENDING",
    },
  });

  if (!school) {
    throw new AppError(
      404,
      "Pending school registration not found",
    );
  }

  // Already verified
  if (school.adminEmailVerified) {
    throw new AppError(
      400,
      "Admin email is already verified",
    );
  }

  // Get OTP from Redis
  const savedCode = await getVerificationCode(email);

  if (!savedCode) {
    throw new AppError(
      400,
      "Verification code has expired or is invalid",
    );
  }

  // Compare OTP
  if (savedCode !== code) {
    throw new AppError(
      400,
      "Invalid verification code",
    );
  }

  // Mark email as verified
  const updatedSchool = await prisma.school.update({
    where: {
      id: school.id,
    },
    data: {
      adminEmailVerified: true,
    },
  });

  // Delete OTP from Redis
  await deleteVerificationCode(email);

  return {
    schoolId: updatedSchool.id,
    adminEmail: updatedSchool.adminEmail,
    emailVerified: updatedSchool.adminEmailVerified,
  };
};