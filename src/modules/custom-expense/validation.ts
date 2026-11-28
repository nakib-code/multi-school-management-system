import { z } from "zod";
import {
	CustomExpenseFieldType,
	PaymentMethod,
} from "../../generated/prisma/client.js";

const schoolIdParam = z.coerce
	.number()
	.int()
	.positive("School ID must be a positive number");

const sheetIdParam = z.coerce
	.number()
	.int()
	.positive("Sheet ID must be a positive number");

const entryIdParam = z.coerce
	.number()
	.int()
	.positive("Entry ID must be a positive number");

const billingMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
const isoDateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const amountSchema = z.coerce
	.number()
	.finite("Amount must be a valid number")
	.positive("Amount must be greater than zero")
	.max(99999999.99, "Amount exceeds maximum allowed value");

const entryDateSchema = z
	.string()
	.trim()
	.refine(
		(val) => {
			if (!val) return false;
			if (isoDateRegex.test(val)) {
				const [y = 0, m = 0, d = 0] = val.split("-").map(Number);
				const dt = new Date(Date.UTC(y, m - 1, d));
				return (
					dt.getUTCFullYear() === y &&
					dt.getUTCMonth() === m - 1 &&
					dt.getUTCDate() === d
				);
			}
			const parsed = new Date(val);
			return !Number.isNaN(parsed.getTime());
		},
		{ message: "Invalid entry date" },
	);

const isoCalendarDateSchema = z
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

const attachmentUrlSchema = z.preprocess(
	(val) => (typeof val === "string" && val.trim() === "" ? null : val),
	z
		.string()
		.trim()
		.url("Attachment must be a valid URL")
		.max(1000)
		.nullable()
		.optional(),
);

const fieldInputSchema = z.object({
	id: z.coerce.number().int().positive().optional(),
	label: z
		.string()
		.trim()
		.min(1, "Field label is required")
		.max(80, "Field label must be 80 characters or fewer"),
	fieldKey: z
		.string()
		.trim()
		.regex(/^[a-z][a-z0-9_]{0,49}$/, "Invalid field key format")
		.optional(),
	fieldType: z
		.nativeEnum(CustomExpenseFieldType)
		.default(CustomExpenseFieldType.TEXT),
	isRequired: z.boolean().optional().default(false),
	sortOrder: z.coerce.number().int().min(0).max(500).optional(),
});

const fieldValuesSchema = z
	.record(
		z.string().max(64),
		z.union([z.string().max(500), z.number().finite(), z.null()]),
	)
	.optional();

export const listSheetsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			includeInactive: z
				.enum(["true", "false"])
				.transform((v) => v === "true")
				.optional(),
			billingMonth: z
				.string()
				.trim()
				.regex(billingMonthRegex, "Billing month must be in YYYY-MM format")
				.optional(),
		})
		.optional(),
});

export const createSheetSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z.object({
		name: z
			.string()
			.trim()
			.min(1, "Sheet name is required")
			.max(120, "Sheet name must be 120 characters or fewer"),
		description: z.string().trim().max(500).nullable().optional(),
		fields: z
			.array(fieldInputSchema)
			.max(25, "A sheet can have at most 25 custom columns")
			.optional()
			.default([]),
	}),
});

export const updateSheetFieldsSchema = z.object({
	params: z.object({
		schoolId: schoolIdParam,
		sheetId: sheetIdParam,
	}),
	body: z.object({
		name: z
			.string()
			.trim()
			.min(1, "Sheet name is required")
			.max(120, "Sheet name must be 120 characters or fewer")
			.optional(),
		description: z.string().trim().max(500).nullable().optional(),
		fields: z
			.array(fieldInputSchema)
			.max(25, "A sheet can have at most 25 custom columns"),
	}),
});

export const deleteSheetSchema = z.object({
	params: z.object({
		schoolId: schoolIdParam,
		sheetId: sheetIdParam,
	}),
	query: z
		.object({
			archive: z
				.enum(["true", "false"])
				.transform((v) => v === "true")
				.optional(),
		})
		.optional(),
});

export const restoreSheetSchema = z.object({
	params: z.object({
		schoolId: schoolIdParam,
		sheetId: sheetIdParam,
	}),
});

export const listEntriesSchema = z.object({
	params: z.object({
		schoolId: schoolIdParam,
		sheetId: sheetIdParam,
	}),
	query: z
		.object({
			billingMonth: z
				.string()
				.trim()
				.regex(billingMonthRegex, "Billing month must be in YYYY-MM format")
				.optional(),
			startDate: isoCalendarDateSchema.optional(),
			endDate: isoCalendarDateSchema.optional(),
			search: z.string().trim().max(120).optional(),
		})
		.optional(),
});

export const createEntrySchema = z.object({
	params: z.object({
		schoolId: schoolIdParam,
		sheetId: sheetIdParam,
	}),
	body: z.object({
		entryDate: entryDateSchema.optional(),
		amount: amountSchema,
		paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
		attachmentUrl: attachmentUrlSchema,
		fieldValues: fieldValuesSchema,
	}),
});

export const updateEntrySchema = z.object({
	params: z.object({
		schoolId: schoolIdParam,
		sheetId: sheetIdParam,
		entryId: entryIdParam,
	}),
	body: z
		.object({
			entryDate: entryDateSchema.optional(),
			amount: amountSchema.optional(),
			paymentMethod: z.nativeEnum(PaymentMethod).optional(),
			attachmentUrl: attachmentUrlSchema,
			fieldValues: fieldValuesSchema,
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field is required to update",
		}),
});

export const deleteEntrySchema = z.object({
	params: z.object({
		schoolId: schoolIdParam,
		sheetId: sheetIdParam,
		entryId: entryIdParam,
	}),
});

export const monthlyChartSchema = z.object({
	params: z.object({
		schoolId: schoolIdParam,
		sheetId: sheetIdParam,
	}),
	query: z.object({
		billingMonth: z
			.string()
			.trim()
			.regex(billingMonthRegex, "Billing month must be in YYYY-MM format"),
		startDate: isoCalendarDateSchema.optional(),
		endDate: isoCalendarDateSchema.optional(),
		search: z.string().trim().max(120).optional(),
	}),
});
