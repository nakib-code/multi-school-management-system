import { z } from "zod";

const billingCycles = ["MONTHLY", "YEARLY"] as const;

export const createPackageSchema = z.object({
	name: z
		.string()
		.min(2, "Package name must be at least 2 characters")
		.max(100, "Package name must not exceed 100 characters"),

	description: z
		.string()
		.max(500, "Description must not exceed 500 characters")
		.optional(),

	price: z.number().min(0, "Price cannot be negative"),

	billingCycle: z.enum(billingCycles).default("MONTHLY"),

	studentLimit: z
		.number()
		.int("Student limit must be an integer")
		.positive("Student limit must be greater than 0"),

	isActive: z.boolean().default(true),
});

export const updatePackageSchema = z.object({
	name: z.string().min(2).max(100).optional(),

	description: z.string().max(500).optional(),

	price: z.number().min(0).optional(),

	billingCycle: z.enum(billingCycles).optional(),

	studentLimit: z.number().int().positive().optional(),

	isActive: z.boolean().optional(),
});

export const packageIdSchema = z.object({
	id: z.coerce.number().int().positive(),
});
