import { z } from "zod";
import {
	AdmissionPaymentStatus,
	AdmissionStatus,
	EnrollmentStatus,
	FeeStatus,
	FeeType,
} from "../../generated/prisma/client.js";

const schoolIdParam = z.coerce
	.number()
	.int()
	.positive("School ID must be a positive number");

const billingMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

export const admissionChartQuerySchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			classId: z.coerce.number().int().positive().optional(),
			sectionId: z.coerce.number().int().positive().optional(),
			academicYear: z.string().trim().min(4).max(20).optional(),
			status: z.nativeEnum(AdmissionStatus).optional(),
			paymentStatus: z.nativeEnum(AdmissionPaymentStatus).optional(),
		})
		.optional(),
});

export const feeChartQuerySchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			feeType: z.union([z.literal("ALL"), z.nativeEnum(FeeType)]).optional(),
			classId: z.coerce.number().int().positive().optional(),
			sectionId: z.coerce.number().int().positive().optional(),
			academicYear: z.string().trim().min(4).max(20).optional(),
			billingMonth: z.string().trim().regex(billingMonthRegex).optional(),
			examId: z.coerce.number().int().positive().optional(),
			status: z.nativeEnum(FeeStatus).optional(),
		})
		.optional(),
});

export const rosterChartQuerySchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			classId: z.coerce.number().int().positive().optional(),
			sectionId: z.coerce.number().int().positive().optional(),
			academicYear: z.string().trim().min(4).max(20).optional(),
			status: z.nativeEnum(EnrollmentStatus).optional(),
		})
		.optional(),
});

export const monthlyNetQuerySchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			billingMonth: z
				.string()
				.trim()
				.regex(billingMonthRegex, "Billing month must be in YYYY-MM format")
				.optional(),
			trendMonths: z.coerce.number().int().min(1).max(12).optional(),
		})
		.optional(),
});
