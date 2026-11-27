import { z } from "zod";

const emptyToUndefined = (val: unknown) =>
	typeof val === "string" && val.trim() === "" ? undefined : val;

const optionalString = (max: number) =>
	z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

const optionalUrl = z.preprocess(
	emptyToUndefined,
	z.string().trim().url("Please provide a valid URL").optional(),
);

const optionalEmail = z.preprocess(
	emptyToUndefined,
	z.string().trim().email("Please provide a valid email").optional(),
);

export const createAdmissionBodySchema = z.object({
	// Stage 1 — Required Student Info
	studentName: z
		.string()
		.trim()
		.min(2, "Student name must be at least 2 characters")
		.max(150),

	dateOfBirth: z.string().trim().min(4, "Date of birth is required"),

	gender: z.enum(["MALE", "FEMALE", "OTHER"]),

	residentialType: z
		.enum(["NON_RESIDENTIAL", "RESIDENTIAL", "DAY_CARE"])
		.default("NON_RESIDENTIAL"),

	// Stage 1 — Required Academic Info
	classId: z.coerce.number().int().positive("Invalid class ID"),

	sectionId: z.preprocess(
		emptyToUndefined,
		z.coerce.number().int().positive("Invalid section ID").optional(),
	),

	academicYear: z.string().trim().min(4, "Academic year is required").max(20),

	shift: z.preprocess(
		emptyToUndefined,
		z.enum(["MORNING", "DAY", "EVENING"]).optional().default("MORNING"),
	),

	academicGroup: z.preprocess(
		emptyToUndefined,
		z.enum(["SCIENCE", "ARTS", "COMMERCE"]).optional(),
	),

	group: optionalString(50),

	quranWing: z.preprocess(
		emptyToUndefined,
		z.enum(["NOORANI", "QAIDA", "AMPARA", "NAJERA", "HEFZ"]).optional(),
	),

	// Stage 1 — Required Guardian Info
	guardianName: z.string().trim().min(2, "Guardian name is required").max(150),

	guardianPhone: z
		.string()
		.trim()
		.min(6, "Guardian phone number is required")
		.max(30),

	guardianRelationship: z.preprocess(
		emptyToUndefined,
		z.string().trim().max(50).optional().default("FATHER"),
	),

	guardianEmail: optionalEmail,
	guardianNid: optionalString(50),
	guardianOccupation: optionalString(100),

	// Optional Student Login (NOT forced)
	studentEmail: optionalEmail,
	password: z.preprocess(
		emptyToUndefined,
		z
			.string()
			.min(6, "Password must be at least 6 characters")
			.max(100)
			.optional(),
	),

	// Stage 2 — Optional Details
	nameBangla: optionalString(150),
	birthRegNo: optionalString(30),
	bloodGroup: optionalString(10),
	previousSchool: optionalString(200),
	previousClass: optionalString(100),
	fatherName: optionalString(150),
	motherName: optionalString(150),
	address: optionalString(500),
	presentAddress: optionalString(500),
	permanentAddress: optionalString(500),

	// Documents (all optional)
	studentPhotoUrl: optionalUrl,
	birthCertificateUrl: optionalUrl,
	previousCertificateUrl: optionalUrl,
	guardianNidUrl: optionalUrl,
	previousTcUrl: optionalUrl,
	marksheetUrl: optionalUrl,

	// Payment (optional — only used when school admission fee is enabled)
	paymentMethod: z.preprocess(
		emptyToUndefined,
		z.enum(["CASH", "ONLINE", "BKASH", "NAGAD", "ROCKET"]).optional(),
	),
});

export const createAdmissionSchema = z.object({
	body: createAdmissionBodySchema,
	params: z.object({
		schoolId: z.coerce.number().int().positive("Invalid school ID"),
	}),
});

export const createPublicSlugAdmissionSchema = z.object({
	body: createAdmissionBodySchema,
	params: z.object({
		slug: z.string().trim().min(1, "School slug is required").max(120),
	}),
});

export const verifyStudentEmailSchema = z.object({
	body: z.object({
		email: z.string().trim().email("Please provide a valid email"),
		code: z
			.string()
			.length(6, "Verification code must be 6 digits")
			.regex(/^\d+$/, "Verification code must contain only numbers"),
	}),
});

export const rejectAdmissionSchema = z.object({
	body: z.object({
		rejectionReason: z
			.string()
			.trim()
			.min(5, "Rejection reason must be at least 5 characters")
			.max(500),
	}),
	params: z.object({
		schoolId: z.coerce.number().int().positive("Invalid school ID"),
		id: z.coerce.number().int().positive("Invalid admission ID"),
	}),
});

export const confirmCashPaymentSchema = z.object({
	body: z.object({
		remarks: z.string().trim().max(500).optional(),
	}),
	params: z.object({
		schoolId: z.coerce.number().int().positive("Invalid school ID"),
		id: z.coerce.number().int().positive("Invalid admission ID"),
	}),
});

export const getAdmissionsSchema = z.object({
	query: z.object({
		page: z.coerce.number().int().positive().optional(),
		limit: z.coerce.number().int().positive().max(100).optional(),
		search: z.string().trim().max(100).optional(),
		classId: z.coerce.number().int().positive().optional(),
		academicYear: z.string().trim().min(4).max(20).optional(),
		status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
		paymentStatus: z
			.enum(["PENDING", "PAID", "FAILED", "CANCELLED"])
			.optional(),
	}),
	params: z.object({
		schoolId: z.coerce.number().int().positive("Invalid school ID"),
	}),
});

export const initiateOnlinePaymentSchema = z.object({
	params: z.object({
		schoolId: z.coerce.number().int().positive("Invalid school ID"),
		id: z.coerce.number().int().positive("Invalid admission ID"),
	}),
	body: z
		.object({
			applicationNo: z
				.string()
				.trim()
				.min(1, "Application number is required")
				.max(100),
			guardianPhone: optionalString(30),
			studentEmail: optionalEmail,
		})
		.refine((data) => Boolean(data.guardianPhone || data.studentEmail), {
			message: "Guardian phone or student email is required",
		}),
});

export const trackAdmissionSchema = z.object({
	body: z
		.object({
			applicationNo: z
				.string()
				.trim()
				.min(1, "Application number is required")
				.max(100),
			schoolId: z.preprocess(
				emptyToUndefined,
				z.coerce.number().int().positive("Invalid school ID").optional(),
			),
			guardianPhone: optionalString(30),
			studentEmail: optionalEmail,
		})
		.refine((data) => Boolean(data.guardianPhone || data.studentEmail), {
			message: "Guardian phone or student email is required",
		}),
});

export const submitOnlinePaymentTrxSchema = z.object({
	body: z
		.object({
			applicationNo: z
				.string()
				.trim()
				.min(1, "Application number is required")
				.max(100),
			schoolId: z.preprocess(
				emptyToUndefined,
				z.coerce.number().int().positive("Invalid school ID").optional(),
			),
			guardianPhone: optionalString(30),
			studentEmail: optionalEmail,
			paymentMethod: z.enum(["BKASH", "NAGAD", "ROCKET"]),
			transactionId: z
				.string()
				.trim()
				.min(4, "Transaction ID must be at least 4 characters")
				.max(100),
			senderPhone: optionalString(30),
		})
		.refine((data) => Boolean(data.guardianPhone || data.studentEmail), {
			message: "Guardian phone or student email is required",
		}),
});

export const verifyOnlinePaymentSchema = z.object({
	body: z.object({
		remarks: z.string().trim().max(500).optional(),
	}),
	params: z.object({
		schoolId: z.coerce.number().int().positive("Invalid school ID"),
		id: z.coerce.number().int().positive("Invalid admission ID"),
	}),
});

export const rejectOnlinePaymentSchema = z.object({
	body: z.object({
		remarks: z
			.string()
			.trim()
			.min(3, "Rejection reason must be at least 3 characters")
			.max(500),
	}),
	params: z.object({
		schoolId: z.coerce.number().int().positive("Invalid school ID"),
		id: z.coerce.number().int().positive("Invalid admission ID"),
	}),
});
