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

		email: z.string().email("Please provide a valid school email").optional(),

		phone: z.string().optional(),

		address: z.string().optional(),

		logo: z.string().url("Logo must be a valid URL").optional(),

		adminName: z
			.string()
			.min(2, "Admin name must be at least 2 characters")
			.max(100, "Admin name is too long"),

		adminEmail: z.string().email("Please provide a valid admin email"),

		adminPhone: z.string().optional(),
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
