import { z } from "zod";

const packageFeatures = [
  "SCHOOL_MANAGEMENT",
  "USER_MANAGEMENT",
  "STUDENT_MANAGEMENT",
  "TEACHER_MANAGEMENT",
  "GUARDIAN_MANAGEMENT",
  "ADMISSION",
  "ATTENDANCE",
  "CLASS_MANAGEMENT",
  "SUBJECT_MANAGEMENT",
  "EXAM_MANAGEMENT",
  "RESULT_MANAGEMENT",
  "FEES_MANAGEMENT",
  "PAYMENT_MANAGEMENT",
  "TEACHER_SALARY",
  "REPORTS",
  "NOTIFICATIONS",
] as const;

const billingCycles = [
  "MONTHLY",
  "YEARLY",
  "CUSTOM",
] as const;

const requestStatuses = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;

const featureSchema = z.object({
  feature: z.enum(packageFeatures),
  enabled: z.boolean().default(true),
});

export const createCustomPackageRequestSchema =
  z.object({
    schoolId: z.coerce.number().int().positive(),

    requestedStudentLimit: z
      .number()
      .int("Student limit must be an integer")
      .positive("Student limit must be greater than 0"),

    requestedPrice: z
      .number()
      .min(0, "Price cannot be negative"),

    billingCycle: z
      .enum(billingCycles)
      .default("CUSTOM"),

    description: z
      .string()
      .max(2000)
      .optional(),

    features: z
      .array(featureSchema)
      .min(
        1,
        "At least one feature must be selected",
      ),
  });

export const reviewCustomPackageRequestSchema =
  z.object({
    status: z.enum([
      "APPROVED",
      "REJECTED",
    ] as const),

    reviewNote: z
      .string()
      .max(2000)
      .optional(),
  });

export const customPackageRequestIdSchema =
  z.object({
    id: z.coerce.number().int().positive(),
  });

export const customPackageRequestQuerySchema =
  z.object({
    status: z
      .enum(requestStatuses)
      .optional(),

    schoolId: z
      .coerce
      .number()
      .int()
      .positive()
      .optional(),
  });