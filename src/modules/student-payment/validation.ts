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
	body: z
		.object({
			studentId: z.coerce.number().int().positive("Student ID is required"),
			feeId: z.coerce.number().int().positive("Fee ID is required"),
			paymentMethod: z.nativeEnum(PaymentMethod),
			senderNumber: z.string().trim().max(30).optional(),
			receiverNumber: bdMobileNumberSchema.optional(),
			trxId: z.string().trim().max(100).optional(),
			paidAmount: z.coerce
				.number()
				.finite()
				.positive("Paid amount must be greater than zero")
				.max(99999999.99, "Paid amount exceeds maximum allowed value"),
			paidAt: z.coerce.date().optional(),
			remarks: z.string().trim().max(500).optional(),
		})
		.superRefine((data, ctx) => {
			const isMfs =
				data.paymentMethod === PaymentMethod.BKASH ||
				data.paymentMethod === PaymentMethod.NAGAD ||
				data.paymentMethod === PaymentMethod.ROCKET;
			if (isMfs) {
				const phoneCheck = bdMobileNumberSchema.safeParse(
					data.senderNumber ?? "",
				);
				if (!phoneCheck.success) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ["senderNumber"],
						message:
							phoneCheck.error.issues[0]?.message ??
							"Valid sender mobile number is required",
					});
				}
				const trxCheck = trxIdSchema.safeParse(data.trxId ?? "");
				if (!trxCheck.success) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ["trxId"],
						message:
							trxCheck.error.issues[0]?.message ??
							"Valid transaction ID is required",
					});
				}
			} else if (
				data.paymentMethod === PaymentMethod.BANK_TRANSFER ||
				data.paymentMethod === PaymentMethod.CHEQUE
			) {
				if (!data.trxId || data.trxId.trim().length < 3) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ["trxId"],
						message: "Bank reference or cheque number is required",
					});
				}
			}
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
