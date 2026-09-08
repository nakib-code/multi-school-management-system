import { z } from "zod";

export const createAdmissionSchema = z.object({
  body: z.object({
    schoolId: z
      .number()
      .int()
      .positive("Invalid school ID"),

    studentName: z
      .string()
      .min(2, "Student name must be at least 2 characters")
      .max(100, "Student name is too long"),

    studentEmail: z
      .string()
      .email("Please provide a valid student email"),

    dateOfBirth: z
      .string()
      .optional(),

    gender: z
      .string()
      .optional(),

    guardianName: z
      .string()
      .optional(),

    guardianPhone: z
      .string()
      .optional(),

    previousSchool: z
      .string()
      .optional(),

    address: z
      .string()
      .optional(),
  }),
});