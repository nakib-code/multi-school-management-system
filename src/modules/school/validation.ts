import { z } from "zod";

export const createSchoolSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "School name must be at least 2 characters")
      .max(150, "School name is too long"),

    code: z
      .string()
      .min(2, "School code must be at least 2 characters")
      .max(30, "School code is too long"),

    email: z
      .string()
      .email("Please provide a valid school email")
      .optional(),

    phone: z
      .string()
      .optional(),

    address: z
      .string()
      .optional(),

    logo: z
      .string()
      .url("Logo must be a valid URL")
      .optional(),

    adminName: z
      .string()
      .min(2, "Admin name must be at least 2 characters")
      .max(100, "Admin name is too long"),

    adminEmail: z
      .string()
      .email("Please provide a valid admin email"),

    adminPhone: z
      .string()
      .optional(),
  }),
});