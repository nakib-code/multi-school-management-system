import { prisma } from "../../lib/prisma.js";

type DashboardRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "TEACHER"
  | "STUDENT"
  | "GUARDIAN";

interface DashboardUser {
  userId: number;
  role: DashboardRole;
  schoolId?: number;
}

const getSuperAdminDashboard = async () => {
  const [
    totalSchools,
    pendingSchools,
    activeSchools,
    blockedSchools,
    rejectedSchools,
  ] = await Promise.all([
    prisma.school.count(),
    prisma.school.count({
      where: {
        status: "PENDING",
      },
    }),
    prisma.school.count({
      where: {
        status: "ACTIVE",
      },
    }),
    prisma.school.count({
      where: {
        status: "BLOCKED",
      },
    }),
    prisma.school.count({
      where: {
        status: "REJECTED",
      },
    }),
  ]);

  return {
    role: "SUPER_ADMIN" as const,
    stats: {
      totalSchools,
      pendingSchools,
      activeSchools,
      blockedSchools,
      rejectedSchools,
    },
  };
};

const getSchoolDashboard = async (
  user: DashboardUser,
) => {
  if (!user.schoolId) {
    throw new Error("School information not found");
  }

  const schoolId = user.schoolId;

  const [
    totalStudents,
    totalTeachers,
    totalManagers,
    totalClasses,
    totalSections,
    totalSubjects,
  ] = await Promise.all([
    prisma.student.count({
      where: {
        schoolId,
      },
    }),
    prisma.teacher.count({
      where: {
        schoolId,
      },
    }),
    prisma.manager.count({
      where: {
        schoolId,
      },
    }),
    prisma.schoolClass.count({
      where: {
        schoolId,
      },
    }),
    prisma.section.count({
      where: {
        schoolId,
      },
    }),
    prisma.subject.count({
      where: {
        schoolId,
      },
    }),
  ]);

  return {
    role: user.role,
    stats: {
      totalStudents,
      totalTeachers,
      totalManagers,
      totalClasses,
      totalSections,
      totalSubjects,
    },
  };
};

export const getDashboard = async (
  user: DashboardUser,
) => {
  switch (user.role) {
    case "SUPER_ADMIN":
      return getSuperAdminDashboard();

    case "ADMIN":
    case "MANAGER":
      return getSchoolDashboard(user);

    default:
      return {
        role: user.role,
        stats: {},
      };
  }
};
