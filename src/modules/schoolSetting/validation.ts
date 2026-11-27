import { z } from "zod";

const mobileAccountTypes = ["PERSONAL", "MERCHANT", "AGENT"] as const;

const nullablePhoneSchema = z
	.string()
	.trim()
	.max(30, "Phone number is too long")
	.nullable()
	.optional();

export const updateAdmissionFeeSchema = z.object({
	body: z.object({
		admissionFee: z.coerce.number().min(0, "Admission fee cannot be negative"),
		bkashNumber: nullablePhoneSchema,
		nagadNumber: nullablePhoneSchema,
		rocketNumber: nullablePhoneSchema,
	}),
});

export const updateSchoolFeaturesSchema = z.object({
	body: z.object({
		hasGeneralSection: z.boolean().optional(),
		hasHefzSection: z.boolean().optional(),
		hasOnlineAdmission: z.boolean().optional(),
		hasTeacherPayroll: z.boolean().optional(),
		smsEnabled: z.boolean().optional(),
	}),
});

export const updateSchoolPaymentMethodsSchema = z.object({
	body: z.object({
		bkashNumber: nullablePhoneSchema,
		bkashType: z.enum(mobileAccountTypes).optional(),
		nagadNumber: nullablePhoneSchema,
		nagadType: z.enum(mobileAccountTypes).optional(),
		rocketNumber: nullablePhoneSchema,
		rocketType: z.enum(mobileAccountTypes).optional(),
		feePaymentInstruction: z.string().trim().max(2000).nullable().optional(),
	}),
});

export const updateWebsiteConnectionSchema = z.object({
	body: z.object({
		externalWebsiteUrl: z
			.string()
			.trim()
			.max(300, "Website URL is too long")
			.nullable()
			.optional(),
		landingAdminEmail: z
			.union([
				z.string().trim().email("Please provide a valid admin email"),
				z.literal(""),
				z.null(),
			])
			.optional(),
		landingAdminPassword: z
			.union([
				z
					.string()
					.min(6, "Landing admin password must be at least 6 characters")
					.max(100),
				z.literal(""),
			])
			.optional(),
	}),
});
