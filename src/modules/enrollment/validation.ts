import { z } from "zod";
import { EnrollmentStatus } from "../../generated/prisma/client.js";

const schoolIdParam = z.coerce
	.number()
	.int()
	.positive("School ID must be a positive number");
const idParam = z.coerce
	.number()
	.int()
	.positive("Enrollment ID must be a positive number");

export const enrollmentSchoolParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			studentId: z.coerce.number().int().positive().optional(),
			classId: z.coerce.number().int().positive().optional(),
			sectionId: z.coerce.number().int().positive().optional(),
			academicYear: z.string().trim().min(1).max(30).optional(),
			status: z.nativeEnum(EnrollmentStatus).optional(),
		})
		.optional(),
});

export const enrollmentParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
});

export const createEnrollmentSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z.object({
		studentId: z.coerce.number().int().positive("Student ID is required"),
		classId: z.coerce.number().int().positive("Class ID is required"),
		sectionId: z.coerce.number().int().positive().optional(),
		academicYear: z.string().trim().min(1, "Academic year is required").max(30),
		rollNumber: z.coerce.number().int().positive().optional(),
		status: z.nativeEnum(EnrollmentStatus).optional(),
	}),
});

export const updateEnrollmentSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
	body: z
		.object({
			classId: z.coerce.number().int().positive().optional(),
			sectionId: z.coerce.number().int().positive().nullable().optional(),
			academicYear: z.string().trim().min(1).max(30).optional(),
			rollNumber: z.coerce.number().int().positive().nullable().optional(),
			status: z.nativeEnum(EnrollmentStatus).optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field is required",
		}),
});
