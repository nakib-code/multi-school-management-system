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

const billingMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

export const studentFeeSchoolParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			studentId: z.coerce.number().int().positive().optional(),
			enrollmentId: z.coerce.number().int().positive().optional(),
			classId: z.coerce.number().int().positive().optional(),
			sectionId: z.coerce.number().int().positive().optional(),
			academicYear: z.string().trim().min(4).max(20).optional(),
			feeType: z.nativeEnum(FeeType).optional(),
			billingMonth: z.string().trim().regex(billingMonthRegex).optional(),
			examId: z.coerce.number().int().positive().optional(),
			status: z.nativeEnum(FeeStatus).optional(),
		})
		.optional(),
});

export const studentFeeParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
});

export const createStudentFeeSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z
		.object({
			studentId: z.coerce.number().int().positive("Student ID is required"),
			enrollmentId: z.coerce
				.number()
				.int()
				.positive("Enrollment ID is required"),
			feeType: z.nativeEnum(FeeType),
			title: z.string().trim().min(1, "Fee title is required").max(150),
			amount: z.coerce
				.number()
				.finite()
				.positive("Amount must be greater than zero")
				.max(99999999.99, "Amount exceeds maximum allowed value")
				.optional(),
			useClassDefaultAmount: z.boolean().optional(),
			applyStudentConcession: z.boolean().optional().default(true),
			dueDate: z.coerce.date(),
			academicYear: z.string().trim().min(4).max(20).optional(),
			billingMonth: z
				.string()
				.trim()
				.regex(billingMonthRegex, "Billing month must be in YYYY-MM format")
				.optional(),
			examId: z.coerce.number().int().positive().optional(),
			status: z.nativeEnum(FeeStatus).optional(),
			description: z.string().trim().max(500).optional(),
		})
		.refine(
			(data) =>
				data.amount !== undefined || data.useClassDefaultAmount === true,
			{
				message: "Amount is required unless useClassDefaultAmount is enabled",
			},
		),
});

export const bulkCreateStudentFeesSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z
		.object({
			classId: z.coerce.number().int().positive("Class ID is required"),
			sectionId: z.coerce.number().int().positive().optional(),
			academicYear: z.string().trim().min(4).max(20).optional(),
			feeType: z.nativeEnum(FeeType),
			title: z.string().trim().min(1, "Fee title is required").max(150),
			amount: z.coerce
				.number()
				.finite()
				.positive("Amount must be greater than zero")
				.max(99999999.99, "Amount exceeds maximum allowed value")
				.optional(),
			useClassDefaultAmount: z.boolean().optional(),
			applyStudentConcession: z.boolean().optional().default(true),
			dueDate: z.coerce.date(),
			billingMonth: z
				.string()
				.trim()
				.regex(billingMonthRegex, "Billing month must be in YYYY-MM format")
				.optional(),
			examId: z.coerce.number().int().positive().optional(),
			description: z.string().trim().max(500).optional(),
		})
		.refine(
			(data) =>
				data.amount !== undefined || data.useClassDefaultAmount === true,
			{
				message: "Amount is required unless useClassDefaultAmount is enabled",
			},
		),
});

export const updateStudentFeeSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
	body: z
		.object({
			feeType: z.nativeEnum(FeeType).optional(),
			title: z.string().trim().min(1).max(150).optional(),
			amount: z.coerce
				.number()
				.finite()
				.min(0, "Amount cannot be negative")
				.max(99999999.99, "Amount exceeds maximum allowed value")
				.optional(),
			dueDate: z.coerce.date().optional(),
			academicYear: z.string().trim().min(4).max(20).nullable().optional(),
			billingMonth: z
				.string()
				.trim()
				.regex(billingMonthRegex)
				.nullable()
				.optional(),
			examId: z.coerce.number().int().positive().nullable().optional(),
			status: z.nativeEnum(FeeStatus).optional(),
			waivedAmount: z.coerce
				.number()
				.finite()
				.min(0, "Waived amount cannot be negative")
				.max(99999999.99, "Waived amount exceeds maximum allowed value")
				.optional(),
			waiverReason: z.string().trim().max(500).nullable().optional(),
			description: z.string().trim().max(500).nullable().optional(),
			remarks: z.string().trim().max(500).nullable().optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field is required",
		}),
});
