import { z } from "zod";

const schoolIdParam = z.coerce
	.number()
	.int()
	.positive("School ID must be a positive number");
const idParam = z.coerce
	.number()
	.int()
	.positive("Assignment ID must be a positive number");

export const teacherAssignmentSchoolParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			teacherId: z.coerce.number().int().positive().optional(),
			classId: z.coerce.number().int().positive().optional(),
			sectionId: z.coerce.number().int().positive().optional(),
			subjectId: z.coerce.number().int().positive().optional(),
			academicYear: z.string().trim().min(1).max(30).optional(),
			isActive: z
				.enum(["true", "false"])
				.transform((v) => v === "true")
				.optional(),
		})
		.optional(),
});

export const teacherAssignmentParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
});

export const createTeacherAssignmentSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z.object({
		teacherId: z.coerce.number().int().positive("Teacher ID is required"),
		classId: z.coerce.number().int().positive("Class ID is required"),
		sectionId: z.coerce.number().int().positive("Section ID is required"),
		subjectId: z.coerce.number().int().positive("Subject ID is required"),
		academicYear: z.string().trim().min(1, "Academic year is required").max(30),
	}),
});

export const updateTeacherAssignmentSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
	body: z
		.object({
			teacherId: z.coerce.number().int().positive().optional(),
			classId: z.coerce.number().int().positive().optional(),
			sectionId: z.coerce.number().int().positive().optional(),
			subjectId: z.coerce.number().int().positive().optional(),
			academicYear: z.string().trim().min(1).max(30).optional(),
			isActive: z.boolean().optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field is required",
		}),
});
