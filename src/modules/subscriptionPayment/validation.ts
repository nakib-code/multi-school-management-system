import { z } from "zod";
import {
	SubscriptionPaymentMethod,
	SubscriptionPaymentStatus,
} from "../../generated/prisma/client.js";
import { bdMobileNumberSchema, trxIdSchema } from "../payment/validation.js";

const subscriptionIdParam = z.coerce
	.number()
	.int()
	.positive("Invalid subscription ID");
const paymentIdParam = z.coerce.number().int().positive("Invalid payment ID");

export const subscriptionIdParamsSchema = z.object({
	params: z.object({
		subscriptionId: subscriptionIdParam,
	}),
});

export const paymentIdParamsSchema = z.object({
	params: z.object({
		paymentId: paymentIdParam,
	}),
});

export const submitSubscriptionPaymentSchema = z.object({
	params: z.object({
		subscriptionId: subscriptionIdParam,
	}),
	body: z.object({
		paymentMethod: z.nativeEnum(SubscriptionPaymentMethod),
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

export const rejectSubscriptionPaymentSchema = z.object({
	params: z.object({
		paymentId: paymentIdParam,
	}),
	body: z.object({
		rejectionReason: z
			.string()
			.trim()
			.min(3, "Rejection reason must be at least 3 characters")
			.max(500, "Rejection reason is too long"),
	}),
});

export const subscriptionPaymentFilterQuerySchema = z.object({
	query: z
		.object({
			schoolId: z.coerce.number().int().positive().optional(),
			subscriptionId: z.coerce.number().int().positive().optional(),
			paymentMethod: z.nativeEnum(SubscriptionPaymentMethod).optional(),
			status: z.nativeEnum(SubscriptionPaymentStatus).optional(),
		})
		.optional(),
});
