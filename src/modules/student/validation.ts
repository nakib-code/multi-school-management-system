import { z } from "zod";

export const createStudentSchema = z.object({
	body: z.object({
		firstName: z
			.string()
			.trim()
			.min(2, "First name must be at least 2 characters")
			.max(100, "First name is too long"),
		lastName: z.string().trim().max(100, "Last name is too long").optional(),
		dateOfBirth: z.coerce.date().optional(),
		gender: z.string().trim().max(20, "Gender is too long").optional(),
		phone: z.string().trim().max(20, "Phone number is too long").optional(),
		address: z.string().trim().max(255, "Address is too long").optional(),
		studentId: z.string().trim().max(40).optional(),

		// Combined Guardian Onboarding (No student login required)
		guardianName: z.string().trim().min(2).max(100).optional(),
		guardianPhone: z.string().trim().min(6).max(20).optional(),
		guardianEmail: z.string().trim().email().optional(),
		guardianRelation: z.string().trim().max(50).optional(),
		guardianOccupation: z.string().trim().max(100).optional(),
		guardianAddress: z.string().trim().max(255).optional(),
		guardianPassword: z.string().min(6).max(100).optional(),
	}),
});

export const updateStudentSchema = z.object({
	body: z.object({
		firstName: z
			.string()
			.min(2, "First name must be at least 2 characters")
			.max(100, "First name is too long")
			.optional(),

		lastName: z.string().max(100, "Last name is too long").optional(),

		dateOfBirth: z.coerce.date().optional(),

		gender: z.string().max(20, "Gender is too long").optional(),

		phone: z.string().max(20, "Phone number is too long").optional(),

		address: z.string().max(255, "Address is too long").optional(),
	}),
});

export const studentListQuerySchema = z.object({
	query: z.object({
		page: z.coerce.number().int().min(1, "Page must be at least 1").optional(),

		limit: z.coerce
			.number()
			.int()
			.min(1, "Limit must be at least 1")
			.max(100, "Limit cannot exceed 100")
			.optional(),

		search: z.string().trim().optional(),
	}),
});
