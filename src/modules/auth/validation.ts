import { z } from "zod";

export const signupSchema = z.object({
	body: z.object({
		name: z
			.string()
			.min(2, "Name must be at least 2 characters")
			.max(100, "Name must be less than 100 characters"),

		email: z.string().email("Please provide a valid email"),

		password: z
			.string()
			.min(8, "Password must be at least 8 characters")
			.max(100, "Password must be less than 100 characters"),

		phone: z
			.string()
			.min(10, "Phone number must be at least 10 characters")
			.max(20, "Phone number must be less than 20 characters")
			.optional(),
	}),
});

export const loginSchema = z.object({
	body: z.object({
		email: z
			.string()
			.trim()
			.min(3, "Please provide your email or phone number"),

		password: z.string().min(1, "Password is required"),
	}),
});

export const forgotPasswordSchema = z.object({
	body: z.object({
		email: z.string().trim().email("Please provide a valid email"),
	}),
});

export const verifyResetTokenSchema = z.object({
	body: z.object({
		token: z.string().trim().min(32, "Invalid reset token"),
	}),
});

export const resetPasswordSchema = z.object({
	body: z.object({
		token: z.string().trim().min(32, "Invalid reset token"),
		password: z
			.string()
			.min(8, "Password must be at least 8 characters")
			.max(100, "Password must be less than 100 characters"),
	}),
});

export const changePasswordSchema = z.object({
	body: z
		.object({
			currentPassword: z.string().min(1, "Current password is required"),
			newPassword: z
				.string()
				.min(8, "New password must be at least 8 characters")
				.max(100, "New password must be less than 100 characters")
				.regex(
					/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
					"New password must contain at least one uppercase letter, one lowercase letter, and one number",
				),
		})
		.refine((data) => data.currentPassword !== data.newPassword, {
			message: "New password must be different from current password",
			path: ["newPassword"],
		}),
});
