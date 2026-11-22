import { z } from "zod";
import { ExamStatus, ExamType } from "../../generated/prisma/client.js";

const schoolIdParam = z.coerce
	.number()
	.int()
	.positive("School ID must be a positive number");
const idParam = z.coerce
	.number()
	.int()
	.positive("Exam ID must be a positive number");

export const examSchoolParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			classId: z.coerce.number().int().positive().optional(),
			sectionId: z.coerce.number().int().positive().optional(),
			type: z.nativeEnum(ExamType).optional(),
			status: z.nativeEnum(ExamStatus).optional(),
			academicYear: z.string().trim().min(1).max(30).optional(),
		})
		.optional(),
});

export const examParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
});

export const createExamSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z
		.object({
			classId: z.coerce.number().int().positive("Class ID is required"),
			sectionId: z.coerce.number().int().positive().optional(),
			name: z.string().trim().min(1, "Exam name is required").max(150),
			type: z.nativeEnum(ExamType),
			academicYear: z
				.string()
				.trim()
				.min(1, "Academic year is required")
				.max(30),
			startDate: z.coerce.date(),
			endDate: z.coerce.date(),
			status: z.nativeEnum(ExamStatus).optional(),
		})
		.refine((data) => data.endDate >= data.startDate, {
			message: "End date must be on or after start date",
		}),
});

export const updateExamSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
	body: z
		.object({
			classId: z.coerce.number().int().positive().optional(),
			sectionId: z.coerce.number().int().positive().nullable().optional(),
			name: z.string().trim().min(1).max(150).optional(),
			type: z.nativeEnum(ExamType).optional(),
			academicYear: z.string().trim().min(1).max(30).optional(),
			startDate: z.coerce.date().optional(),
			endDate: z.coerce.date().optional(),
			status: z.nativeEnum(ExamStatus).optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field is required",
		}),
});
