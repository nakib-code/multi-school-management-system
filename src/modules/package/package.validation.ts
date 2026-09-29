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

const billingCycles = ["MONTHLY", "YEARLY", "CUSTOM"] as const;

const featureSchema = z.object({
  feature: z.enum(packageFeatures),
  enabled: z.boolean().default(true),
});

export const createPackageSchema = z.object({
  name: z
    .string()
    .min(2, "Package name must be at least 2 characters")
    .max(100, "Package name must not exceed 100 characters"),

  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .optional(),

  price: z
    .number()
    .min(0, "Price cannot be negative"),

  billingCycle: z
    .enum(billingCycles)
    .default("MONTHLY"),

  studentLimit: z
    .number()
    .int("Student limit must be an integer")
    .positive("Student limit must be greater than 0"),

  isCustom: z
    .boolean()
    .default(false),

  isActive: z
    .boolean()
    .default(true),

  features: z
    .array(featureSchema)
    .min(1, "At least one feature is required"),
});

export const updatePackageSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(100)
    .optional(),

  description: z
    .string()
    .max(500)
    .optional(),

  price: z
    .number()
    .min(0)
    .optional(),

  billingCycle: z
    .enum(billingCycles)
    .optional(),

  studentLimit: z
    .number()
    .int()
    .positive()
    .optional(),

  isActive: z
    .boolean()
    .optional(),

  features: z
    .array(featureSchema)
    .min(1)
    .optional(),
});

export const packageIdSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive(),
});
