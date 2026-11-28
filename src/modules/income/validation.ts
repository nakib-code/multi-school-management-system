import { z } from "zod";
import { PaymentMethod } from "../../generated/prisma/client.js";

const schoolIdParam = z.coerce
	.number()
	.int()
	.positive("School ID must be a positive number");

const idParam = z.coerce
	.number()
	.int()
	.positive("Income entry ID must be a positive number");

const billingMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
const isoDateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const amountSchema = z.coerce
	.number()
	.finite("Amount must be a valid number")
	.positive("Amount must be greater than zero")
	.max(99999999.99, "Amount exceeds maximum allowed value");

const dateStringSchema = z
	.string()
	.trim()
	.refine(
		(val) => {
			if (!isoDateRegex.test(val)) return false;
			const [y = 0, m = 0, d = 0] = val.split("-").map(Number);
			const dt = new Date(Date.UTC(y, m - 1, d));
			return (
				dt.getUTCFullYear() === y &&
				dt.getUTCMonth() === m - 1 &&
				dt.getUTCDate() === d
			);
		},
		{ message: "Date must be a valid YYYY-MM-DD calendar date" },
	);

const categoryFilterSchema = z.enum([
	"ALL",
	"MONTHLY_FEE",
	"ADMISSION_FEE",
	"OTHER_STUDENT_FEE",
	"OTHER_INCOME",
]);

export const createOtherIncomeSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z.object({
		sourceLabel: z
			.string()
			.trim()
			.min(1, "Source label is required")
			.max(100, "Source label must be 100 characters or fewer"),
		title: z
			.string()
			.trim()
			.min(1, "Title is required")
			.max(160, "Title must be 160 characters or fewer"),
		amount: amountSchema,
		incomeDate: dateStringSchema.optional(),
		paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
		referenceNo: z.string().trim().max(100).nullable().optional(),
		notes: z.string().trim().max(500).nullable().optional(),
	}),
});

export const updateOtherIncomeSchema = z.object({
	params: z.object({
		schoolId: schoolIdParam,
		id: idParam,
	}),
	body: z
		.object({
			sourceLabel: z.string().trim().min(1).max(100).optional(),
			title: z.string().trim().min(1).max(160).optional(),
			amount: amountSchema.optional(),
			incomeDate: dateStringSchema.optional(),
			paymentMethod: z.nativeEnum(PaymentMethod).optional(),
			referenceNo: z.string().trim().max(100).nullable().optional(),
			notes: z.string().trim().max(500).nullable().optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field is required to update",
		}),
});

export const deleteOtherIncomeSchema = z.object({
	params: z.object({
		schoolId: schoolIdParam,
		id: idParam,
	}),
});

export const incomeSummarySchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			billingMonth: z
				.string()
				.trim()
				.regex(billingMonthRegex, "Billing month must be in YYYY-MM format")
				.optional(),
			category: categoryFilterSchema.optional(),
			startDate: dateStringSchema.optional(),
			endDate: dateStringSchema.optional(),
			search: z.string().trim().max(120).optional(),
		})
		.optional(),
});

export const incomeChartSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z.object({
		billingMonth: z
			.string()
			.trim()
			.regex(billingMonthRegex, "Billing month must be in YYYY-MM format"),
		category: categoryFilterSchema.optional(),
	}),
});
