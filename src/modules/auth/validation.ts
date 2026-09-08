import { z } from "zod";

export const signupSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be less than 100 characters"),

    email: z
      .string()
      .email("Please provide a valid email"),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be less than 100 characters"),

    phone: z
      .string()
      .min(10, "Phone number must be at least 10 characters")
      .max(20, "Phone number must be less than 20 characters")
      .optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email("Please provide a valid email"),

    password: z
      .string()
      .min(1, "Password is required"),
  }),
});