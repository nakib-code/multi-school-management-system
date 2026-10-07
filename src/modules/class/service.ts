import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";

import type {
  CreateClassInput,
  UpdateClassInput,
} from "./interface.js";

// ============================================
// Helpers
// ============================================

const ensureSchoolExists = async (schoolId: number) => {
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

  return school;
};

const ensureClassExists = async (
  schoolId: number,
  classId: number,
) => {
  const schoolClass = await prisma.schoolClass.findFirst({
    where: {
      id: classId,
      schoolId,
    },
  });

  if (!schoolClass) {
    throw new AppError(404, "Class not found");
  }

  return schoolClass;
};

// ============================================
// Create Class
// ============================================

export const createClass = async (
  schoolId: number,
  payload: Omit<CreateClassInput, "schoolId">,
) => {
  await ensureSchoolExists(schoolId);

  const code = payload.code.trim();

  const existingClass =
    await prisma.schoolClass.findUnique({
      where: {
        schoolId_code: {
          schoolId,
          code,
        },
      },
    });

  if (existingClass) {
    throw new AppError(
      409,
      "A class with this code already exists",
    );
  }

  return prisma.schoolClass.create({
    data: {
      schoolId,
      name: payload.name.trim(),
      code,
      description: payload.description?.trim() || null,
    },
  });
};

// ============================================
// Get All Classes
// ============================================

export const getClasses = async (
  schoolId: number,
) => {
  await ensureSchoolExists(schoolId);

  return prisma.schoolClass.findMany({
    where: {
      schoolId,
    },

    include: {
      _count: {
        select: {
          sections: true,
          teacherAssignments: true,
          enrollments: true,
          exams: true,
          admissions: true,
        },
      },
    },

    orderBy: [
      {
        name: "asc",
      },
      {
        id: "asc",
      },
    ],
  });
};

// ============================================
// Get Active Classes
// ============================================

export const getActiveClasses = async (
  schoolId: number,
) => {
  await ensureSchoolExists(schoolId);

  return prisma.schoolClass.findMany({
    where: {
      schoolId,
      isActive: true,
    },

    select: {
      id: true,
      name: true,
      code: true,
      description: true,
    },

    orderBy: {
      name: "asc",
    },
  });
};

// ============================================
// Get Single Class
// ============================================

export const getClassById = async (
  schoolId: number,
  classId: number,
) => {
  await ensureSchoolExists(schoolId);

  const schoolClass =
    await prisma.schoolClass.findFirst({
      where: {
        id: classId,
        schoolId,
      },

      include: {
        sections: {
          orderBy: {
            name: "asc",
          },
        },

        _count: {
          select: {
            sections: true,
            teacherAssignments: true,
            enrollments: true,
            exams: true,
            admissions: true,
          },
        },
      },
    });

  if (!schoolClass) {
    throw new AppError(404, "Class not found");
  }

  return schoolClass;
};

// ============================================
// Update Class
// ============================================

export const updateClass = async (
  schoolId: number,
  classId: number,
  payload: UpdateClassInput,
) => {
  const existingClass = await ensureClassExists(
    schoolId,
    classId,
  );

  if (
    payload.code &&
    payload.code.trim() !== existingClass.code
  ) {
    const duplicate =
      await prisma.schoolClass.findUnique({
        where: {
          schoolId_code: {
            schoolId,
            code: payload.code.trim(),
          },
        },
      });

    if (duplicate) {
      throw new AppError(
        409,
        "A class with this code already exists",
      );
    }
  }

  return prisma.schoolClass.update({
    where: {
      id: classId,
    },

    data: {
      ...(payload.name !== undefined && {
        name: payload.name.trim(),
      }),

      ...(payload.code !== undefined && {
        code: payload.code.trim(),
      }),

      ...(payload.description !== undefined && {
        description:
          payload.description.trim() || null,
      }),

      ...(payload.isActive !== undefined && {
        isActive: payload.isActive,
      }),
    },
  });
};

// ============================================
// Toggle Class Status
// ============================================

export const toggleClassStatus = async (
  schoolId: number,
  classId: number,
) => {
  const schoolClass = await ensureClassExists(
    schoolId,
    classId,
  );

  return prisma.schoolClass.update({
    where: {
      id: classId,
    },

    data: {
      isActive: !schoolClass.isActive,
    },
  });
};

// ============================================
// Delete Class
// ============================================

export const deleteClass = async (
  schoolId: number,
  classId: number,
) => {
  const schoolClass = await ensureClassExists(
    schoolId,
    classId,
  );

  const counts = await prisma.schoolClass.findUnique({
    where: {
      id: schoolClass.id,
    },

    select: {
      _count: {
        select: {
          sections: true,
          teacherAssignments: true,
          enrollments: true,
          exams: true,
          admissions: true,
        },
      },
    },
  });

  if (!counts) {
    throw new AppError(404, "Class not found");
  }

  const hasDependencies =
    counts._count.sections > 0 ||
    counts._count.teacherAssignments > 0 ||
    counts._count.enrollments > 0 ||
    counts._count.exams > 0 ||
    counts._count.admissions > 0;

  if (hasDependencies) {
    throw new AppError(
      400,
      "This class cannot be deleted because it has related records. Deactivate it instead.",
    );
  }

  await prisma.schoolClass.delete({
    where: {
      id: classId,
    },
  });

  return {
    classId,
    deleted: true,
  };
};