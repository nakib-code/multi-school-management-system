import { z } from "zod";

const emptyToUndefined = (val: unknown) =>
	typeof val === "string" && val.trim() === "" ? undefined : val;

const emptyToNull = (val: unknown) =>
	typeof val === "string" && val.trim() === "" ? null : val;

const optStr = (max: number) =>
	z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

const nullableOptStr = (max: number) =>
	z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional());

const optUrl = z.preprocess(
	emptyToUndefined,
	z.string().trim().url("Please provide a valid URL").optional(),
);

const nullableOptUrl = z.preprocess(
	emptyToNull,
	z.string().trim().url("Please provide a valid URL").nullable().optional(),
);

const optDate = z.preprocess(emptyToUndefined, z.coerce.date().optional());
const nullableOptDate = z.preprocess(
	emptyToNull,
	z.coerce.date().nullable().optional(),
);

const stage2CreateFields = {
	nameBangla: optStr(150),
	birthRegNo: optStr(30),
	bloodGroup: optStr(10),
	religion: optStr(50),
	nationality: optStr(60),
	studentPhotoUrl: optUrl,

	// Parents & Emergency
	fatherName: optStr(150),
	fatherPhone: optStr(30),
	fatherOccupation: optStr(100),
	fatherNid: optStr(50),
	motherName: optStr(150),
	motherPhone: optStr(30),
	motherOccupation: optStr(100),
	motherNid: optStr(50),
	emergencyContactName: optStr(150),
	emergencyContactPhone: optStr(30),

	// Addresses
	address: optStr(500),
	presentAddress: optStr(500),
	permanentAddress: optStr(500),

	// Kindergarten / Junior Safety
	authorizedPickupName: optStr(150),
	authorizedPickupRelation: optStr(50),
	authorizedPickupPhone: optStr(30),
	authorizedPickupNid: optStr(50),
	pickupPersonPhotoUrl: optUrl,

	// Class 9-10 / Board Exam
	boardName: optStr(100),
	boardRollNo: optStr(50),
	boardRegNo: optStr(50),
	fourthSubject: optStr(100),

	// Previous Institution / Transfer
	previousSchool: optStr(200),
	previousClass: optStr(100),
	tcNumber: optStr(80),
	tcDate: optDate,

	// Health & Care Notes
	allergies: optStr(500),
	medicalConditions: optStr(500),
	medications: optStr(500),
	healthNotes: optStr(1000),

	// Documents
	birthCertificateUrl: optUrl,
	guardianNidUrl: optUrl,
	previousTcUrl: optUrl,
	marksheetUrl: optUrl,

	// Fee Concession / Scholarship Profile
	concessionType: z.preprocess(
		emptyToUndefined,
		z.enum(["ORPHAN", "LILLAH", "SIBLING", "SCHOLARSHIP", "CUSTOM"]).optional(),
	),
	concessionMode: z.preprocess(
		emptyToUndefined,
		z.enum(["PERCENTAGE", "FIXED"]).optional(),
	),
	concessionValue: z.preprocess(
		emptyToUndefined,
		z.coerce.number().finite().min(0).max(99999999.99).optional(),
	),
	concessionReason: optStr(300),
};

export const createStudentSchema = z.object({
	body: z
		.object({
			// Stage 1 — Required Student Info
			studentName: z.preprocess(
				emptyToUndefined,
				z.string().trim().min(2).max(150).optional(),
			),
			firstName: z.preprocess(
				emptyToUndefined,
				z.string().trim().min(2).max(100).optional(),
			),
			lastName: optStr(100),
			dateOfBirth: z.coerce.date(),
			gender: z.enum(["MALE", "FEMALE", "OTHER"]),
			residentialType: z
				.enum(["NON_RESIDENTIAL", "RESIDENTIAL", "DAY_CARE"])
				.default("NON_RESIDENTIAL"),
			phone: optStr(30),
			studentId: optStr(40),

			// Stage 1 — Required Academic Info
			academicYear: z
				.string()
				.trim()
				.min(4, "Academic year is required")
				.max(20),
			classId: z.coerce.number().int().positive("Class is required"),
			sectionId: z.preprocess(
				emptyToUndefined,
				z.coerce.number().int().positive().optional(),
			),
			rollNumber: z.preprocess(
				emptyToUndefined,
				z.coerce.number().int().positive().optional(),
			),
			shift: z.preprocess(
				emptyToUndefined,
				z.enum(["MORNING", "DAY", "EVENING"]).optional().default("MORNING"),
			),
			academicGroup: z.preprocess(
				emptyToUndefined,
				z.enum(["SCIENCE", "ARTS", "COMMERCE"]).optional(),
			),
			quranWing: z.preprocess(
				emptyToUndefined,
				z.enum(["NOORANI", "QAIDA", "AMPARA", "NAJERA", "HEFZ"]).optional(),
			),
			ustadId: z.preprocess(
				emptyToUndefined,
				z.coerce.number().int().positive().optional(),
			),

			// Stage 1 — Required Guardian Onboarding (No student login required)
			guardianName: z
				.string()
				.trim()
				.min(2, "Guardian name is required")
				.max(150),
			guardianPhone: z
				.string()
				.trim()
				.min(6, "Guardian phone is required")
				.max(30),
			guardianRelation: z.preprocess(
				emptyToUndefined,
				z.string().trim().max(50).optional().default("FATHER"),
			),
			guardianEmail: z.preprocess(
				emptyToUndefined,
				z.string().trim().email("Valid guardian email is required").optional(),
			),
			guardianNid: optStr(50),
			guardianOccupation: optStr(100),
			guardianAddress: optStr(300),
			guardianPassword: z.preprocess(
				emptyToUndefined,
				z.string().min(6).max(100).optional(),
			),

			...stage2CreateFields,
		})
		.refine((data) => Boolean(data.studentName || data.firstName), {
			message: "Student name is required",
			path: ["studentName"],
		}),
});

export const updateStudentSchema = z.object({
	body: z.object({
		firstName: z.string().trim().min(2).max(100).optional(),
		lastName: nullableOptStr(100),
		nameBangla: nullableOptStr(150),
		dateOfBirth: nullableOptDate,
		gender: z.preprocess(
			emptyToNull,
			z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
		),
		phone: nullableOptStr(30),
		residentialType: z
			.enum(["NON_RESIDENTIAL", "RESIDENTIAL", "DAY_CARE"])
			.optional(),
		shift: z.preprocess(
			emptyToNull,
			z.enum(["MORNING", "DAY", "EVENING"]).nullable().optional(),
		),
		quranWing: z.preprocess(
			emptyToNull,
			z
				.enum(["NOORANI", "QAIDA", "AMPARA", "NAJERA", "HEFZ"])
				.nullable()
				.optional(),
		),

		// Identity & Localization
		birthRegNo: nullableOptStr(30),
		bloodGroup: nullableOptStr(10),
		religion: nullableOptStr(50),
		nationality: nullableOptStr(60),
		studentPhotoUrl: nullableOptUrl,

		// Parents & Emergency
		fatherName: nullableOptStr(150),
		fatherPhone: nullableOptStr(30),
		fatherOccupation: nullableOptStr(100),
		fatherNid: nullableOptStr(50),
		motherName: nullableOptStr(150),
		motherPhone: nullableOptStr(30),
		motherOccupation: nullableOptStr(100),
		motherNid: nullableOptStr(50),
		emergencyContactName: nullableOptStr(150),
		emergencyContactPhone: nullableOptStr(30),

		// Addresses
		address: nullableOptStr(500),
		presentAddress: nullableOptStr(500),
		permanentAddress: nullableOptStr(500),

		// Kindergarten / Junior Safety
		authorizedPickupName: nullableOptStr(150),
		authorizedPickupRelation: nullableOptStr(50),
		authorizedPickupPhone: nullableOptStr(30),
		authorizedPickupNid: nullableOptStr(50),
		pickupPersonPhotoUrl: nullableOptUrl,

		// Class 9-10 / Board Exam
		academicGroup: z.preprocess(
			emptyToNull,
			z.enum(["SCIENCE", "ARTS", "COMMERCE"]).nullable().optional(),
		),
		boardName: nullableOptStr(100),
		boardRollNo: nullableOptStr(50),
		boardRegNo: nullableOptStr(50),
		fourthSubject: nullableOptStr(100),

		// Previous Institution / Transfer
		previousSchool: nullableOptStr(200),
		previousClass: nullableOptStr(100),
		tcNumber: nullableOptStr(80),
		tcDate: nullableOptDate,

		// Health & Care Notes
		allergies: nullableOptStr(500),
		medicalConditions: nullableOptStr(500),
		medications: nullableOptStr(500),
		healthNotes: nullableOptStr(1000),

		// Documents
		birthCertificateUrl: nullableOptUrl,
		guardianNidUrl: nullableOptUrl,
		previousTcUrl: nullableOptUrl,
		marksheetUrl: nullableOptUrl,

		// Fee Concession / Scholarship Profile
		concessionType: z.preprocess(
			emptyToNull,
			z
				.enum(["ORPHAN", "LILLAH", "SIBLING", "SCHOLARSHIP", "CUSTOM"])
				.nullable()
				.optional(),
		),
		concessionMode: z.preprocess(
			emptyToNull,
			z.enum(["PERCENTAGE", "FIXED"]).nullable().optional(),
		),
		concessionValue: z.preprocess(
			emptyToNull,
			z.coerce.number().finite().min(0).max(99999999.99).nullable().optional(),
		),
		concessionReason: nullableOptStr(300),
	}),
});

export const studentListQuerySchema = z.object({
	query: z.object({
		page: z.coerce.number().int().min(1, "Page must be at least 1").optional(),
		limit: z.coerce
			.number()
			.int()
			.min(1, "Limit must be at least 1")
			.max(100, "Limit cannot exceed 100")
			.optional(),
		search: z.string().trim().optional(),
	}),
});
