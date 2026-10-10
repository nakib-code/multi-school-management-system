import { z } from "zod";

export const createAdmissionSchema = z.object({
  body: z.object({
    // Student Information
    studentName: z
      .string()
      .trim()
      .min(2, "Student name must be at least 2 characters")
      .max(150),

    studentEmail: z
      .string()
      .trim()
      .email("Please provide a valid student email"),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100),

    dateOfBirth: z.string().optional(),

    gender: z
      .string()
      .trim()
      .max(30)
      .optional(),

    bloodGroup: z
      .string()
      .trim()
      .max(10)
      .optional(),

    previousSchool: z
      .string()
      .trim()
      .max(200)
      .optional(),

    previousClass: z
      .string()
      .trim()
      .max(100)
      .optional(),

    // Guardian Information
    guardianName: z
      .string()
      .trim()
      .max(150)
      .optional(),

    guardianEmail: z
      .string()
      .trim()
      .email("Please provide a valid guardian email")
      .optional(),

    guardianPhone: z
      .string()
      .trim()
      .max(30)
      .optional(),

    guardianRelationship: z
      .string()
      .trim()
      .max(50)
      .optional(),

    guardianNid: z
      .string()
      .trim()
      .max(50)
      .optional(),

    guardianOccupation: z
      .string()
      .trim()
      .max(100)
      .optional(),

    // Address
    address: z
      .string()
      .trim()
      .max(500)
      .optional(),

    // Application Information
    classId: z.coerce
      .number()
      .int()
      .positive("Invalid class ID"),

    academicYear: z
      .string()
      .trim()
      .min(4, "Academic year is required")
      .max(20),

    shift: z
      .string()
      .trim()
      .max(50)
      .optional(),

    group: z
      .string()
      .trim()
      .max(50)
      .optional(),

    // Documents
    studentPhotoUrl: z
      .string()
      .url()
      .optional(),

    birthCertificateUrl: z
      .string()
      .url()
      .optional(),

    previousCertificateUrl: z
      .string()
      .url()
      .optional(),

    // Payment
    paymentMethod: z.enum(["CASH", "ONLINE"]),
  }),

  params: z.object({
    schoolId: z.coerce
      .number()
      .int()
      .positive("Invalid school ID"),
  }),
});

export const verifyStudentEmailSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .email("Please provide a valid email"),

    code: z
      .string()
      .length(
        6,
        "Verification code must be 6 digits",
      )
      .regex(
        /^\d+$/,
        "Verification code must contain only numbers",
      ),
  }),
});

export const rejectAdmissionSchema = z.object({
  body: z.object({
    rejectionReason: z
      .string()
      .trim()
      .min(
        5,
        "Rejection reason must be at least 5 characters",
      )
      .max(500),
  }),

  params: z.object({
    schoolId: z.coerce
      .number()
      .int()
      .positive("Invalid school ID"),

    id: z.coerce
      .number()
      .int()
      .positive("Invalid admission ID"),
  }),
});

export const confirmCashPaymentSchema = z.object({
  body: z.object({
    remarks: z
      .string()
      .trim()
      .max(500)
      .optional(),
  }),

  params: z.object({
    schoolId: z.coerce
      .number()
      .int()
      .positive("Invalid school ID"),

    id: z.coerce
      .number()
      .int()
      .positive("Invalid admission ID"),
  }),
});

/**
 * Get Admissions
 *
 * Admin / Manager admission list filters.
 */
export const getAdmissionsSchema = z.object({
  query: z.object({
    page: z.coerce
      .number()
      .int()
      .positive()
      .optional(),

    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(100)
      .optional(),

    search: z
      .string()
      .trim()
      .max(100)
      .optional(),

    status: z
      .enum([
        "PENDING",
        "APPROVED",
        "REJECTED",
      ])
      .optional(),

    paymentStatus: z
      .enum([
        "PENDING",
        "PAID",
        "FAILED",
        "CANCELLED",
      ])
      .optional(),
  }),

  params: z.object({
    schoolId: z.coerce
      .number()
      .int()
      .positive("Invalid school ID"),
  }),
});

export const trackAdmissionSchema = z.object({
  applicationNo: z
    .string()
    .trim()
    .min(
      1,
      "Application number is required",
    )
    .max(100),

  studentEmail: z
    .string()
    .trim()
    .email(
      "Please provide a valid student email",
    ),
});