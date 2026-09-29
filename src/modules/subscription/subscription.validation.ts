import { z } from "zod";

const subscriptionStatuses = [
  "ACTIVE",
  "EXPIRED",
  "CANCELLED",
  "PENDING",
] as const;

export const createSubscriptionSchema = z
  .object({
    schoolId: z.coerce
      .number()
      .int()
      .positive(),

    packageId: z.coerce
      .number()
      .int()
      .positive(),

    startDate: z.coerce.date(),

    endDate: z.coerce.date(),

    price: z
      .number()
      .min(0, "Price cannot be negative"),

    notes: z
      .string()
      .max(1000, "Notes must not exceed 1000 characters")
      .optional(),
  })
  .refine(
    (data) => data.endDate > data.startDate,
    {
      message: "End date must be after start date",
      path: ["endDate"],
    },
  );

export const updateSubscriptionSchema = z
  .object({
    startDate: z.coerce.date().optional(),

    endDate: z.coerce.date().optional(),

    price: z
      .number()
      .min(0, "Price cannot be negative")
      .optional(),

    notes: z
      .string()
      .max(1000, "Notes must not exceed 1000 characters")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate > data.startDate;
      }

      return true;
    },
    {
      message: "End date must be after start date",
      path: ["endDate"],
    },
  );

export const updateSubscriptionStatusSchema = z.object({
  status: z.enum(subscriptionStatuses),
});

export const subscriptionIdSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive(),
});

export const schoolIdSchema = z.object({
  schoolId: z.coerce
    .number()
    .int()
    .positive(),
});