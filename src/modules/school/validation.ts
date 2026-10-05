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

		adminPassword: z
			.string()
			.min(8, "Admin password must be at least 8 characters")
			.max(100, "Admin password is too long"),

		adminPhone: z.string().optional(),
	}),
});

export const verifyAdminEmailSchema = z.object({
	body: z.object({
		email: z.string().email("Please provide a valid email"),

		code: z
			.string()
			.length(6, "Verification code must be 6 digits")
			.regex(/^\d+$/, "Verification code must contain only digits"),
	}),
});

export const rejectSchoolSchema = z.object({
	body: z.object({
		rejectionReason: z
			.string()
			.min(5, "Rejection reason must be at least 5 characters")
			.max(500, "Rejection reason is too long"),
	}),
});

export const schoolIdParamsSchema = z.object({
	params: z.object({
		id: z.coerce.number().int().positive("School ID must be a positive number"),
	}),
});

export const getSchoolUsersSchema = z.object({
	params: z.object({
		id: z.coerce.number().int().positive("School ID must be a positive number"),
	}),

	query: z.object({
		page: z.coerce.number().int().min(1).optional().default(1),

		limit: z.coerce.number().int().min(1).max(100).optional().default(10),

		search: z.string().trim().optional(),

		role: z
			.enum(["ADMIN", "MANAGER", "TEACHER", "STUDENT", "GUARDIAN"])
			.optional(),

		status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
	}),
});
