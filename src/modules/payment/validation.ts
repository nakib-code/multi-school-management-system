import { z } from "zod";

export const manualPaymentMethodEnum = z.enum(["BKASH", "NAGAD", "ROCKET"]);
export const manualPaymentStatusEnum = z.enum([
	"PENDING",
	"VERIFIED",
	"REJECTED",
]);

export const bdMobileNumberSchema = z
	.string()
	.trim()
	.regex(
		/^(\+?88)?01[3-9]\d{8,9}$/,
		"Must be a valid Bangladesh mobile banking number",
	);

export const trxIdSchema = z
	.string()
	.trim()
	.min(4, "Transaction ID must be at least 4 characters")
	.max(100, "Transaction ID is too long")
	.regex(
		/^[A-Za-z0-9_-]+$/,
		"Transaction ID can only contain letters, numbers, hyphens, and underscores",
	);

export const rejectManualPaymentSchema = z.object({
	body: z.object({
		rejectionReason: z
			.string()
			.trim()
			.min(3, "Rejection reason is required")
			.max(500, "Rejection reason is too long"),
	}),
});
