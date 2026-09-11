import { z } from "zod";

export const createTeacherSchema = z.object({
	body: z.object({
		name: z.string().min(2).max(100),
		email: z.string().email(),
		password: z.string().min(8).max(100),

		employeeId: z.string().min(2).max(50),

		firstName: z.string().min(2).max(100),
		lastName: z.string().max(100).optional(),

		phone: z.string().max(20).optional(),
		address: z.string().max(500).optional(),

		dateOfBirth: z.string().optional(),
		joiningDate: z.string().optional(),

		designation: z.string().max(100).optional(),
		qualification: z.string().max(200).optional(),
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
