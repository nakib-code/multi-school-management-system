import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import type { CreateAdmissionInput } from "./interface.js";

export const createAdmission = async (
  payload: CreateAdmissionInput,
) => {
  const {
    schoolId,
    studentName,
    studentEmail,
    dateOfBirth,
    gender,
    guardianName,
    guardianPhone,
    previousSchool,
    address,
  } = payload;

  // Check school
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
  });

  if (!school) {
    throw new AppError(404, "School not found");
  }

  if (!school.isActive) {
    throw new AppError(400, "School is not active");
  }

  // Check if student email already belongs to a user
  const existingUser = await prisma.user.findUnique({
    where: { email: studentEmail },
  });

  if (existingUser) {
    throw new AppError(
      409,
      "A user with this email already exists",
    );
  }

  // Generate application number
  const applicationNo = `ADM-${Date.now()}`;

  const admission = await prisma.admission.create({
    data: {
      schoolId,
      applicationNo,
      studentName,
      studentEmail,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender,
      guardianName,
      guardianPhone,
      previousSchool,
      address,
      status: "PENDING",
    },
  });

  return admission;
};