import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";

export const getMyStudentProfile = async (
  userId: number,
  schoolId: number,
) => {
  const student = await prisma.student.findFirst({
    where: {
      userId,
      schoolId,
      isActive: true,
    },
    select: {
      id: true,
      studentId: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      gender: true,
      phone: true,
      address: true,
      admissionDate: true,
      isActive: true,

      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          schoolId: true,
        },
      },
    },
  });

  if (!student) {
    throw new AppError(
      404,
      "Student profile not found",
    );
  }

  return student;
};