import { z } from "zod";

const emptyToUndefined = (val: unknown) =>
	typeof val === "string" && val.trim() === "" ? undefined : val;

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
		phone: z.string().trim().min(6, "Phone number is required").max(30),
		email: z.preprocess(
			emptyToUndefined,
			z.string().trim().email("Valid email is required").optional(),
		),
		password: z.preprocess(
			emptyToUndefined,
			z
				.string()
				.min(6, "Password must be at least 6 characters")
				.max(100)
				.optional(),
		),
		relation: z.preprocess(
			emptyToUndefined,
			z.string().trim().max(50).optional(),
		),
		occupation: z.preprocess(
			emptyToUndefined,
			z.string().trim().max(100).optional(),
		),
		address: z.preprocess(
			emptyToUndefined,
			z.string().trim().max(300).optional(),
		),
		nid: z.preprocess(
			emptyToUndefined,
			z.string().trim().max(50).optional(),
		),
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
			nid: z.string().trim().max(50).nullable().optional(),
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
