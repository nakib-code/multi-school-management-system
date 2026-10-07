import { z } from "zod";

export const schoolClassParamsSchema = z.object({
  params: z.object({
    schoolId: z.coerce
      .number()
      .int()
      .positive("School ID must be a positive number"),

    id: z.coerce
      .number()
      .int()
      .positive("Class ID must be a positive number"),
  }),
});

export const schoolClassSchoolParamsSchema = z.object({
  params: z.object({
    schoolId: z.coerce
      .number()
      .int()
      .positive("School ID must be a positive number"),
  }),
});

export const createClassSchema = z.object({
  params: z.object({
    schoolId: z.coerce
      .number()
      .int()
      .positive("School ID must be a positive number"),
  }),

  body: z.object({
    name: z
      .string()
      .trim()
      .min(1, "Class name is required")
      .max(100, "Class name is too long"),

    code: z
      .string()
      .trim()
      .min(1, "Class code is required")
      .max(50, "Class code is too long"),

    description: z
      .string()
      .trim()
      .max(500, "Description is too long")
      .optional(),
  }),
});

export const updateClassSchema = z.object({
  params: z.object({
    schoolId: z.coerce
      .number()
      .int()
      .positive("School ID must be a positive number"),

    id: z.coerce
      .number()
      .int()
      .positive("Class ID must be a positive number"),
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

      description: z
        .string()
        .trim()
        .max(500)
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

export const toggleClassStatusSchema = z.object({
  params: z.object({
    schoolId: z.coerce
      .number()
      .int()
      .positive("School ID must be a positive number"),

    id: z.coerce
      .number()
      .int()
      .positive("Class ID must be a positive number"),
  }),
});