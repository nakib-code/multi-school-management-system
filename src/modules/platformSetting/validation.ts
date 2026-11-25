import { z } from "zod";

const mobileAccountTypes = ["PERSONAL", "MERCHANT", "AGENT"] as const;

const nullablePhoneSchema = z
	.string()
	.trim()
	.max(30, "Phone number is too long")
	.nullable()
	.optional();

export const updatePlatformSettingSchema = z.object({
	body: z.object({
		platformName: z
			.string()
			.trim()
			.min(2, "Platform name must be at least 2 characters")
			.max(120)
			.optional(),
		supportPhone: nullablePhoneSchema,
		bkashNumber: nullablePhoneSchema,
		bkashType: z.enum(mobileAccountTypes).optional(),
		nagadNumber: nullablePhoneSchema,
		nagadType: z.enum(mobileAccountTypes).optional(),
		rocketNumber: nullablePhoneSchema,
		rocketType: z.enum(mobileAccountTypes).optional(),
		paymentInstruction: z.string().trim().max(2000).nullable().optional(),
	}),
});
