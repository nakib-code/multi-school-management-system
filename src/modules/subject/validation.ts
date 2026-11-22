import { z } from "zod";

const schoolIdParam = z.coerce
	.number()
	.int()
	.positive("School ID must be a positive number");

const idParam = z.coerce
	.number()
	.int()
	.positive("Subject ID must be a positive number");

export const subjectSchoolParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
});

export const subjectParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
});

export const createSubjectSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z
		.object({
			name: z.string().trim().min(1, "Subject name is required").max(100),
			code: z.string().trim().min(1, "Subject code is required").max(50),
			description: z.string().trim().max(500).optional(),
			fullMarks: z.coerce.number().int().positive().max(1000).optional(),
			passMarks: z.coerce.number().int().min(0).max(1000).optional(),
		})
		.refine(
			(data) =>
				data.fullMarks === undefined ||
				data.passMarks === undefined ||
				data.passMarks <= data.fullMarks,
			{ message: "Pass marks cannot exceed full marks" },
		),
});

export const updateSubjectSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
	body: z
		.object({
			name: z.string().trim().min(1).max(100).optional(),
			code: z.string().trim().min(1).max(50).optional(),
			description: z.string().trim().max(500).optional(),
			fullMarks: z.coerce.number().int().positive().max(1000).optional(),
			passMarks: z.coerce.number().int().min(0).max(1000).optional(),
			isActive: z.boolean().optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field is required",
		}),
});
