import { z } from "zod";
import { PaymentMethod, PaymentStatus } from "../../generated/prisma/client.js";
import { bdMobileNumberSchema, trxIdSchema } from "../payment/validation.js";

const schoolIdParam = z.coerce
	.number()
	.int()
	.positive("School ID must be a positive number");
const idParam = z.coerce
	.number()
	.int()
	.positive("Student payment ID must be a positive number");

export const studentPaymentSchoolParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			studentId: z.coerce.number().int().positive().optional(),
			feeId: z.coerce.number().int().positive().optional(),
			paymentMethod: z.nativeEnum(PaymentMethod).optional(),
			status: z.nativeEnum(PaymentStatus).optional(),
		})
		.optional(),
});

export const studentPaymentParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
});

export const createStudentPaymentSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z.object({
		studentId: z.coerce.number().int().positive("Student ID is required"),
		feeId: z.coerce.number().int().positive("Fee ID is required"),
		paymentMethod: z.nativeEnum(PaymentMethod),
		senderNumber: bdMobileNumberSchema,
		receiverNumber: bdMobileNumberSchema.optional(),
		trxId: trxIdSchema,
		paidAmount: z.coerce
			.number()
			.positive("Paid amount must be greater than zero"),
		paidAt: z.coerce.date().optional(),
		remarks: z.string().trim().max(500).optional(),
	}),
});

export const rejectStudentPaymentSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
	body: z.object({
		rejectionReason: z
			.string()
			.trim()
			.min(3, "Rejection reason must be at least 3 characters")
			.max(500, "Rejection reason is too long"),
	}),
});
