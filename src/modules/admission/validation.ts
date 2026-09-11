import { z } from "zod";

export const createAdmissionSchema = z.object({
	body: z.object({
		studentName: z.string().min(2).max(150),

		studentEmail: z.string().email(),

		password: z.string().min(8).max(100),

		dateOfBirth: z.string().optional(),

		gender: z.string().optional(),

		guardianName: z.string().optional(),

		guardianPhone: z.string().optional(),

		previousSchool: z.string().optional(),

		address: z.string().optional(),

		paymentMethod: z.enum(["CASH", "ONLINE"]),
	}),

	params: z.object({
		schoolId: z.coerce.number().int().positive("Invalid school ID"),
	}),
});

export const verifyStudentEmailSchema = z.object({
	body: z.object({
		email: z.string().email("Please provide a valid email"),

		code: z
			.string()
			.length(6, "Verification code must be 6 digits")
			.regex(/^\d+$/, "Verification code must contain only digits"),
	}),
});

export const rejectAdmissionSchema = z.object({
	body: z.object({
		rejectionReason: z.string().min(5).max(500),
	}),
});

export const confirmCashPaymentSchema = z.object({
	body: z.object({
		remarks: z.string().max(500).optional(),
	}),

	params: z.object({
		schoolId: z.coerce.number().int().positive("Invalid school ID"),

		id: z.coerce.number().int().positive("Invalid admission ID"),
	}),
});
