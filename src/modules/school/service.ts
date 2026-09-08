import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import type { CreateSchoolInput } from "./interface.js";

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
  },
});

  return {
    school,
    admin: {
      name: adminName,
      email: adminEmail,
      phone: adminPhone,
    },
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

  const updatedSchool = await prisma.school.update({
    where: { id: schoolId },
    data: {
      status: "ACTIVE",
    },
  });

  return updatedSchool;
};