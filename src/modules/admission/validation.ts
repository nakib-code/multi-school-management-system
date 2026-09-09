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
      .max(150, "Student name is too long"),

    studentEmail: z
      .string()
      .email("Please provide a valid student email"),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password is too long"),

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

export const verifyStudentEmailSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email("Please provide a valid email"),

    code: z
      .string()
      .length(6, "Verification code must be 6 digits")
      .regex(
        /^\d+$/,
        "Verification code must contain only digits",
      ),
  }),
});

export const rejectAdmissionSchema = z.object({
  body: z.object({
    rejectionReason: z.string().min(5).max(500),
  }),
});