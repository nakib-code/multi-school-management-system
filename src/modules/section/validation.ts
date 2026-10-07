import { z } from "zod";

const schoolIdParam = z.coerce
  .number()
  .int()
  .positive("School ID must be a positive number");

const sectionIdParam = z.coerce
  .number()
  .int()
  .positive("Section ID must be a positive number");

const classIdParam = z.coerce
  .number()
  .int()
  .positive("Class ID must be a positive number");

export const createSectionSchema = z.object({
  params: z.object({
    schoolId: schoolIdParam,
  }),

  body: z.object({
    classId: classIdParam,

    name: z
      .string()
      .trim()
      .min(1, "Section name is required")
      .max(100, "Section name is too long"),

    code: z
      .string()
      .trim()
      .min(1, "Section code is required")
      .max(50, "Section code is too long"),

    capacity: z
      .coerce
      .number()
      .int()
      .positive("Capacity must be a positive number")
      .optional(),

    roomNumber: z
      .string()
      .trim()
      .max(50, "Room number is too long")
      .optional(),
  }),
});

export const sectionSchoolParamsSchema = z.object({
  params: z.object({
    schoolId: schoolIdParam,
  }),

  query: z.object({
    classId: z.coerce
      .number()
      .int()
      .positive()
      .optional(),
  }),
});

export const sectionParamsSchema = z.object({
  params: z.object({
    schoolId: schoolIdParam,
    id: sectionIdParam,
  }),
});

export const updateSectionSchema = z.object({
  params: z.object({
    schoolId: schoolIdParam,
    id: sectionIdParam,
  }),

  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .optional(),

      code: z
        .string()
        .trim()
        .min(1)
        .max(50)
        .optional(),

      capacity: z
        .coerce
        .number()
        .int()
        .positive()
        .nullable()
        .optional(),

      roomNumber: z
        .string()
        .trim()
        .max(50)
        .nullable()
        .optional(),

      isActive: z.boolean().optional(),
    })
    .refine(
      (data) => Object.keys(data).length > 0,
      {
        message: "At least one field is required",
      },
    ),
});

export const toggleSectionStatusSchema =
  z.object({
    params: z.object({
      schoolId: schoolIdParam,
      id: sectionIdParam,
    }),
  });