import { z } from "zod";
import { SalaryStatus } from "../../generated/prisma/client.js";

const schoolIdParam = z.coerce
	.number()
	.int()
	.positive("School ID must be a positive number");
const idParam = z.coerce
	.number()
	.int()
	.positive("Teacher salary ID must be a positive number");

export const teacherSalarySchoolParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			teacherId: z.coerce.number().int().positive().optional(),
			month: z.coerce.number().int().min(1).max(12).optional(),
			year: z.coerce.number().int().min(2000).max(2100).optional(),
			status: z.nativeEnum(SalaryStatus).optional(),
		})
		.optional(),
});

export const teacherSalaryParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
});

export const createTeacherSalarySchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z.object({
		teacherId: z.coerce.number().int().positive("Teacher ID is required"),
		month: z.coerce.number().int().min(1).max(12),
		year: z.coerce.number().int().min(2000).max(2100),
		basicSalary: z.coerce.number().min(0, "Basic salary cannot be negative"),
		bonus: z.coerce.number().min(0).optional(),
		deduction: z.coerce.number().min(0).optional(),
		status: z.nativeEnum(SalaryStatus).optional(),
		remarks: z.string().trim().max(500).optional(),
	}),
});

export const updateTeacherSalarySchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
	body: z
		.object({
			basicSalary: z.coerce.number().min(0).optional(),
			bonus: z.coerce.number().min(0).optional(),
			deduction: z.coerce.number().min(0).optional(),
			status: z.nativeEnum(SalaryStatus).optional(),
			remarks: z.string().trim().max(500).nullable().optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field is required",
		}),
});
