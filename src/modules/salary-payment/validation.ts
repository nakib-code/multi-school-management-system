import { z } from "zod";
import {
	SalaryPaymentMethod,
	SalaryPaymentStatus,
} from "../../generated/prisma/client.js";

const schoolIdParam = z.coerce
	.number()
	.int()
	.positive("School ID must be a positive number");
const idParam = z.coerce
	.number()
	.int()
	.positive("Salary payment ID must be a positive number");

export const salaryPaymentSchoolParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			teacherId: z.coerce.number().int().positive().optional(),
			salaryId: z.coerce.number().int().positive().optional(),
			paymentMethod: z.nativeEnum(SalaryPaymentMethod).optional(),
			status: z.nativeEnum(SalaryPaymentStatus).optional(),
		})
		.optional(),
});

export const salaryPaymentParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
});

export const createSalaryPaymentSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z.object({
		teacherId: z.coerce.number().int().positive("Teacher ID is required"),
		salaryId: z.coerce.number().int().positive("Salary ID is required"),
		transactionId: z.string().trim().min(3).max(120).optional(),
		amount: z.coerce.number().positive("Amount must be greater than zero"),
		paymentMethod: z.nativeEnum(SalaryPaymentMethod),
		status: z.nativeEnum(SalaryPaymentStatus).optional(),
		paidAt: z.coerce.date().optional(),
		remarks: z.string().trim().max(500).optional(),
	}),
});

export const updateSalaryPaymentSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
	body: z
		.object({
			status: z.nativeEnum(SalaryPaymentStatus).optional(),
			remarks: z.string().trim().max(500).nullable().optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field is required",
		}),
});
