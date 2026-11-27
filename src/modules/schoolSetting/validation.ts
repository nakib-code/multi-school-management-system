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
		hasPublicWebsite: z.boolean().optional(),
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
