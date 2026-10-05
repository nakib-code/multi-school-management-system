import { z } from "zod";

const subscriptionStatuses = [
	"ACTIVE",
	"EXPIRED",
	"CANCELLED",
	"PENDING",
] as const;

/**
 * Super Admin - Create Subscription
 */
export const createSubscriptionSchema = z
	.object({
		schoolId: z.coerce.number().int().positive(),

		packageId: z.coerce.number().int().positive(),

		startDate: z.coerce.date(),

		endDate: z.coerce.date(),

		price: z.number().min(0, "Price cannot be negative"),

		notes: z
			.string()
			.max(1000, "Notes must not exceed 1000 characters")
			.optional(),
	})
	.refine((data) => data.endDate > data.startDate, {
		message: "End date must be after start date",
		path: ["endDate"],
	});

/**
 * Admin - Select Subscription Package
 *
 * School ID is NOT accepted from the client.
 * It comes from the authenticated Admin's user.schoolId.
 */
export const selectPackageSchema = z.object({
	packageId: z.coerce.number().int().positive("Please select a valid package"),
});

/**
 * Super Admin - Update Subscription
 */
export const updateSubscriptionSchema = z
	.object({
		startDate: z.coerce.date().optional(),

		endDate: z.coerce.date().optional(),

		price: z.number().min(0, "Price cannot be negative").optional(),

		notes: z
			.string()
			.max(1000, "Notes must not exceed 1000 characters")
			.optional(),
	})
	.refine(
		(data) => {
			if (data.startDate && data.endDate) {
				return data.endDate > data.startDate;
			}

			return true;
		},
		{
			message: "End date must be after start date",
			path: ["endDate"],
		},
	);

/**
 * Super Admin - Update Subscription Status
 */
export const updateSubscriptionStatusSchema = z.object({
	status: z.enum(subscriptionStatuses),
});

/**
 * Subscription ID Params
 */
export const subscriptionIdSchema = z.object({
	id: z.coerce.number().int().positive(),
});

/**
 * School ID Params
 */
export const schoolIdSchema = z.object({
	schoolId: z.coerce.number().int().positive(),
});
