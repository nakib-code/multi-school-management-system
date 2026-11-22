import { z } from "zod";

const schoolIdParam = z.coerce
	.number()
	.int()
	.positive("School ID must be a positive number");
const idParam = z.coerce
	.number()
	.int()
	.positive("Manager ID must be a positive number");

export const managerSchoolParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
});

export const managerParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
});

export const createManagerSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z.object({
		email: z.string().trim().email("Valid email is required"),
		password: z.string().min(6, "Password must be at least 6 characters"),
		employeeId: z.string().trim().min(1, "Employee ID is required").max(50),
		firstName: z.string().trim().min(1, "First name is required").max(100),
		lastName: z.string().trim().max(100).optional(),
		phone: z.string().trim().max(30).optional(),
		address: z.string().trim().max(300).optional(),
		dateOfBirth: z.coerce.date().optional(),
		joiningDate: z.coerce.date().optional(),
		designation: z.string().trim().max(100).optional(),
	}),
});

export const updateManagerSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
	body: z
		.object({
			firstName: z.string().trim().min(1).max(100).optional(),
			lastName: z.string().trim().max(100).nullable().optional(),
			phone: z.string().trim().max(30).nullable().optional(),
			address: z.string().trim().max(300).nullable().optional(),
			dateOfBirth: z.coerce.date().nullable().optional(),
			designation: z.string().trim().max(100).nullable().optional(),
			isActive: z.boolean().optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field is required",
		}),
});
