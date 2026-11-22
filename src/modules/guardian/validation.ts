import { z } from "zod";

const schoolIdParam = z.coerce
	.number()
	.int()
	.positive("School ID must be a positive number");
const idParam = z.coerce
	.number()
	.int()
	.positive("Guardian ID must be a positive number");
const studentIdParam = z.coerce
	.number()
	.int()
	.positive("Student ID must be a positive number");

export const guardianSchoolParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
});

export const guardianParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
});

export const guardianStudentParamsSchema = z.object({
	params: z.object({
		schoolId: schoolIdParam,
		id: idParam,
		studentId: studentIdParam,
	}),
});

export const createGuardianSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z.object({
		name: z.string().trim().min(2, "Name is required").max(120),
		email: z.string().trim().email("Valid email is required"),
		password: z.string().min(6, "Password must be at least 6 characters"),
		phone: z.string().trim().max(30).optional(),
		relation: z.string().trim().max(50).optional(),
		occupation: z.string().trim().max(100).optional(),
		address: z.string().trim().max(300).optional(),
		studentIds: z.array(z.coerce.number().int().positive()).optional(),
	}),
});

export const updateGuardianSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
	body: z
		.object({
			name: z.string().trim().min(2).max(120).optional(),
			phone: z.string().trim().max(30).nullable().optional(),
			relation: z.string().trim().max(50).nullable().optional(),
			occupation: z.string().trim().max(100).nullable().optional(),
			address: z.string().trim().max(300).nullable().optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field is required",
		}),
});

export const linkGuardianStudentSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
	body: z.object({
		studentId: z.coerce.number().int().positive("Student ID is required"),
		isPrimary: z.boolean().optional(),
	}),
});
