import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import type { CreateSectionInput, UpdateSectionInput } from "./interface.js";



// ============================================
// Helpers
// ============================================

const ensureSchoolExists = async (
  schoolId: number,
) => {
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
  const schoolClass =
    await prisma.schoolClass.findFirst({
      where: {
        id: classId,
        schoolId,
      },

      select: {
        id: true,
        schoolId: true,
        name: true,
        code: true,
        isActive: true,
      },
    });

  if (!schoolClass) {
    throw new AppError(404, "Class not found");
  }

  return schoolClass;
};

const ensureSectionExists = async (
  schoolId: number,
  sectionId: number,
) => {
  const section = await prisma.section.findFirst({
    where: {
      id: sectionId,
      schoolId,
    },
  });

  if (!section) {
    throw new AppError(404, "Section not found");
  }

  return section;
};

// ============================================
// Create Section
// ============================================

export const createSection = async (
  schoolId: number,
  payload: Omit<CreateSectionInput, "schoolId">,
) => {
  await ensureSchoolExists(schoolId);

  const schoolClass = await ensureClassExists(
    schoolId,
    payload.classId,
  );

  if (!schoolClass.isActive) {
    throw new AppError(
      400,
      "Cannot create a section under an inactive class",
    );
  }

  const code = payload.code.trim();

  const existingSection =
    await prisma.section.findUnique({
      where: {
        classId_code: {
          classId: payload.classId,
          code,
        },
      },
    });

  if (existingSection) {
    throw new AppError(
      409,
      "A section with this code already exists in this class",
    );
  }

  return prisma.section.create({
    data: {
      schoolId,
      classId: payload.classId,
      name: payload.name.trim(),
      code,
      capacity: payload.capacity ?? null,
      roomNumber:
        payload.roomNumber?.trim() || null,
    },

    include: {
      class: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });
};

// ============================================
// Get Sections
// ============================================

export const getSections = async (
  schoolId: number,
  classId?: number,
) => {
  await ensureSchoolExists(schoolId);

  if (classId !== undefined) {
    await ensureClassExists(
      schoolId,
      classId,
    );
  }

  return prisma.section.findMany({
    where: {
      schoolId,

      ...(classId !== undefined && {
        classId,
      }),
    },

    include: {
      class: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },

      _count: {
        select: {
          teacherAssignments: true,
          enrollments: true,
          exams: true,
          admissions: true,
        },
      },
    },

    orderBy: [
      {
        class: {
          name: "asc",
        },
      },
      {
        name: "asc",
      },
    ],
  });
};

// ============================================
// Get Active Sections
// ============================================

export const getActiveSections = async (
  schoolId: number,
  classId?: number,
) => {
  await ensureSchoolExists(schoolId);

  if (classId !== undefined) {
    await ensureClassExists(
      schoolId,
      classId,
    );
  }

  return prisma.section.findMany({
    where: {
      schoolId,
      isActive: true,

      ...(classId !== undefined && {
        classId,
      }),
    },

    select: {
      id: true,
      classId: true,
      name: true,
      code: true,
      capacity: true,
      roomNumber: true,
    },

    orderBy: {
      name: "asc",
    },
  });
};

// ============================================
// Get Single Section
// ============================================

export const getSectionById = async (
  schoolId: number,
  sectionId: number,
) => {
  await ensureSchoolExists(schoolId);

  const section = await prisma.section.findFirst({
    where: {
      id: sectionId,
      schoolId,
    },

    include: {
      class: {
        select: {
          id: true,
          name: true,
          code: true,
          isActive: true,
        },
      },

      _count: {
        select: {
          teacherAssignments: true,
          enrollments: true,
          exams: true,
          admissions: true,
        },
      },
    },
  });

  if (!section) {
    throw new AppError(404, "Section not found");
  }

  return section;
};

// ============================================
// Update Section
// ============================================

export const updateSection = async (
  schoolId: number,
  sectionId: number,
  payload: UpdateSectionInput,
) => {
  const existingSection =
    await ensureSectionExists(
      schoolId,
      sectionId,
    );

  if (
    payload.code &&
    payload.code.trim() !== existingSection.code
  ) {
    const duplicate =
      await prisma.section.findUnique({
        where: {
          classId_code: {
            classId: existingSection.classId,
            code: payload.code.trim(),
          },
        },
      });

    if (duplicate) {
      throw new AppError(
        409,
        "A section with this code already exists in this class",
      );
    }
  }

  return prisma.section.update({
    where: {
      id: sectionId,
    },

    data: {
      ...(payload.name !== undefined && {
        name: payload.name.trim(),
      }),

      ...(payload.code !== undefined && {
        code: payload.code.trim(),
      }),

      ...(payload.capacity !== undefined && {
        capacity: payload.capacity,
      }),

      ...(payload.roomNumber !== undefined && {
        roomNumber:
          payload.roomNumber?.trim() || null,
      }),

      ...(payload.isActive !== undefined && {
        isActive: payload.isActive,
      }),
    },

    include: {
      class: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });
};

// ============================================
// Toggle Section Status
// ============================================

export const toggleSectionStatus = async (
  schoolId: number,
  sectionId: number,
) => {
  const section =
    await ensureSectionExists(
      schoolId,
      sectionId,
    );

  return prisma.section.update({
    where: {
      id: sectionId,
    },

    data: {
      isActive: !section.isActive,
    },
  });
};

// ============================================
// Delete Section
// ============================================

export const deleteSection = async (
  schoolId: number,
  sectionId: number,
) => {
  const section =
    await ensureSectionExists(
      schoolId,
      sectionId,
    );

  const counts = await prisma.section.findUnique({
    where: {
      id: section.id,
    },

    select: {
      _count: {
        select: {
          teacherAssignments: true,
          enrollments: true,
          exams: true,
          admissions: true,
        },
      },
    },
  });

  if (!counts) {
    throw new AppError(404, "Section not found");
  }

  const hasDependencies =
    counts._count.teacherAssignments > 0 ||
    counts._count.enrollments > 0 ||
    counts._count.exams > 0 ||
    counts._count.admissions > 0;

  if (hasDependencies) {
    throw new AppError(
      400,
      "This section cannot be deleted because it has related records. Deactivate it instead.",
    );
  }

  await prisma.section.delete({
    where: {
      id: sectionId,
    },
  });

  return {
    sectionId,
    deleted: true,
  };
};