import { z } from "zod";
import { FeeStatus, FeeType } from "../../generated/prisma/client.js";

const schoolIdParam = z.coerce
	.number()
	.int()
	.positive("School ID must be a positive number");
const idParam = z.coerce
	.number()
	.int()
	.positive("Student fee ID must be a positive number");

export const studentFeeSchoolParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			studentId: z.coerce.number().int().positive().optional(),
			enrollmentId: z.coerce.number().int().positive().optional(),
			feeType: z.nativeEnum(FeeType).optional(),
			status: z.nativeEnum(FeeStatus).optional(),
		})
		.optional(),
});

export const studentFeeParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
});

export const createStudentFeeSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z.object({
		studentId: z.coerce.number().int().positive("Student ID is required"),
		enrollmentId: z.coerce.number().int().positive("Enrollment ID is required"),
		feeType: z.nativeEnum(FeeType),
		title: z.string().trim().min(1, "Fee title is required").max(150),
		amount: z.coerce.number().positive("Amount must be greater than zero"),
		dueDate: z.coerce.date(),
		status: z.nativeEnum(FeeStatus).optional(),
		description: z.string().trim().max(500).optional(),
	}),
});

export const updateStudentFeeSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
	body: z
		.object({
			feeType: z.nativeEnum(FeeType).optional(),
			title: z.string().trim().min(1).max(150).optional(),
			amount: z.coerce.number().positive().optional(),
			dueDate: z.coerce.date().optional(),
			status: z.nativeEnum(FeeStatus).optional(),
			description: z.string().trim().max(500).nullable().optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field is required",
		}),
});
