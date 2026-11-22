import { z } from "zod";
import { Grade } from "../../generated/prisma/client.js";

const schoolIdParam = z.coerce
	.number()
	.int()
	.positive("School ID must be a positive number");
const idParam = z.coerce
	.number()
	.int()
	.positive("Result ID must be a positive number");

export const resultSchoolParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			studentId: z.coerce.number().int().positive().optional(),
			examId: z.coerce.number().int().positive().optional(),
			subjectId: z.coerce.number().int().positive().optional(),
			enrollmentId: z.coerce.number().int().positive().optional(),
		})
		.optional(),
});

export const resultParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
});

export const createResultSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z.object({
		studentId: z.coerce.number().int().positive("Student ID is required"),
		examId: z.coerce.number().int().positive("Exam ID is required"),
		subjectId: z.coerce.number().int().positive("Subject ID is required"),
		enrollmentId: z.coerce.number().int().positive("Enrollment ID is required"),
		marks: z.coerce.number().min(0, "Marks cannot be negative").max(999.99),
		grade: z.nativeEnum(Grade).optional(),
		gradePoint: z.coerce.number().min(0).max(5).optional(),
		remarks: z.string().trim().max(500).optional(),
		publishedAt: z.coerce.date().optional(),
	}),
});

export const updateResultSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
	body: z
		.object({
			marks: z.coerce.number().min(0).max(999.99).optional(),
			grade: z.nativeEnum(Grade).optional(),
			gradePoint: z.coerce.number().min(0).max(5).optional(),
			remarks: z.string().trim().max(500).nullable().optional(),
			publishedAt: z.coerce.date().nullable().optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field is required",
		}),
});
