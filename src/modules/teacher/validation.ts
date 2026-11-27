import { z } from "zod";

const emptyToUndefined = (val: unknown) =>
	typeof val === "string" && val.trim() === "" ? undefined : val;

export const createTeacherSchema = z.object({
	body: z.object({
		name: z.string().trim().min(2).max(100),
		email: z.string().trim().email(),
		password: z.preprocess(
			emptyToUndefined,
			z
				.string()
				.min(8, "Password must be at least 8 characters")
				.max(100)
				.optional(),
		),

		employeeId: z.string().trim().min(2).max(50),

		firstName: z.string().trim().min(2).max(100),
		lastName: z.preprocess(
			emptyToUndefined,
			z.string().trim().max(100).optional(),
		),

		phone: z.preprocess(emptyToUndefined, z.string().trim().max(20).optional()),
		address: z.preprocess(
			emptyToUndefined,
			z.string().trim().max(500).optional(),
		),

		dateOfBirth: z.preprocess(emptyToUndefined, z.string().optional()),
		joiningDate: z.preprocess(emptyToUndefined, z.string().optional()),

		designation: z.preprocess(
			emptyToUndefined,
			z.string().trim().max(100).optional(),
		),
		qualification: z.preprocess(
			emptyToUndefined,
			z.string().trim().max(200).optional(),
		),
	}),
});

export const verifyTeacherEmailSchema = z.object({
	body: z.object({
		code: z
			.string()
			.length(6)
			.regex(/^\d+$/, "Verification code must contain only numbers"),
	}),
});

export const resetTeacherPasswordSchema = z.object({
	body: z.object({
		password: z
			.string()
			.min(8, "Password must be at least 8 characters")
			.max(100),
		mustChangePassword: z.boolean().optional().default(true),
	}),
});
