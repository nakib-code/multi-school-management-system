import { z } from "zod";
import {
	HefzAttendanceStatus,
	HefzEnrollmentStatus,
	HefzWing,
	SobokQuality,
} from "../../generated/prisma/client.js";

const schoolIdParam = z.coerce
	.number()
	.int()
	.positive("School ID must be a positive number");
const idParam = z.coerce
	.number()
	.int()
	.positive("ID must be a positive number");
const studentIdParam = z.coerce
	.number()
	.int()
	.positive("Student ID must be a positive number");

export const hefzSchoolParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
});

export const hefzIdParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
});

export const hefzEnrollmentQuerySchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			studentId: z.coerce.number().int().positive().optional(),
			ustadId: z.coerce.number().int().positive().optional(),
			wing: z.nativeEnum(HefzWing).optional(),
			status: z.nativeEnum(HefzEnrollmentStatus).optional(),
		})
		.optional(),
});

export const createHefzEnrollmentSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z.object({
		studentId: z.coerce.number().int().positive("Student ID is required"),
		ustadId: z.coerce.number().int().positive("Ustad (Teacher) ID is required"),
		wing: z.nativeEnum(HefzWing).optional(),
		currentPara: z.coerce.number().int().min(1).max(30).optional(),
		currentSurah: z.string().trim().max(120).optional(),
		startDate: z.coerce.date().optional(),
		status: z.nativeEnum(HefzEnrollmentStatus).optional(),
	}),
});

export const updateHefzEnrollmentSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
	body: z
		.object({
			ustadId: z.coerce.number().int().positive().optional(),
			wing: z.nativeEnum(HefzWing).optional(),
			currentPara: z.coerce.number().int().min(1).max(30).nullable().optional(),
			currentSurah: z.string().trim().max(120).nullable().optional(),
			status: z.nativeEnum(HefzEnrollmentStatus).optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field is required",
		}),
});

export const hefzDailyLogQuerySchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			hefzEnrollmentId: z.coerce.number().int().positive().optional(),
			studentId: z.coerce.number().int().positive().optional(),
			ustadId: z.coerce.number().int().positive().optional(),
			wing: z.nativeEnum(HefzWing).optional(),
			sobokQuality: z.nativeEnum(SobokQuality).optional(),
			attendanceStatus: z.nativeEnum(HefzAttendanceStatus).optional(),
			fromDate: z.coerce.date().optional(),
			toDate: z.coerce.date().optional(),
		})
		.optional(),
});

export const createHefzDailyLogSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z.object({
		hefzEnrollmentId: z.coerce
			.number()
			.int()
			.positive("Hefz enrollment ID is required"),
		logDate: z.coerce.date(),
		sobok: z.string().trim().min(1, "Sobok lesson is required").max(500),
		sobokPagesOrLines: z.string().trim().max(100).optional(),
		sobokQuality: z.nativeEnum(SobokQuality).optional(),
		sobokAm: z.string().trim().max(500).optional(),
		manzil: z.string().trim().max(500).optional(),
		manzilParas: z.string().trim().max(100).optional(),
		attendanceStatus: z.nativeEnum(HefzAttendanceStatus).optional(),
		ustadNote: z.string().trim().max(2000).optional(),
		currentPara: z.coerce.number().int().min(1).max(30).optional(),
		currentSurah: z.string().trim().max(120).optional(),
	}),
});

export const updateHefzDailyLogSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
	body: z
		.object({
			sobok: z.string().trim().min(1).max(500).optional(),
			sobokPagesOrLines: z.string().trim().max(100).nullable().optional(),
			sobokQuality: z.nativeEnum(SobokQuality).optional(),
			sobokAm: z.string().trim().max(500).nullable().optional(),
			manzil: z.string().trim().max(500).nullable().optional(),
			manzilParas: z.string().trim().max(100).nullable().optional(),
			attendanceStatus: z.nativeEnum(HefzAttendanceStatus).optional(),
			ustadNote: z.string().trim().max(2000).nullable().optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field is required",
		}),
});

export const hefzStudentProgressSchema = z.object({
	params: z.object({
		schoolId: schoolIdParam,
		studentId: studentIdParam,
	}),
	query: z
		.object({
			fromDate: z.coerce.date().optional(),
			toDate: z.coerce.date().optional(),
			limit: z.coerce.number().int().positive().max(100).optional(),
		})
		.optional(),
});

export const hefzGuardianProgressSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			fromDate: z.coerce.date().optional(),
			toDate: z.coerce.date().optional(),
			limit: z.coerce.number().int().positive().max(100).optional(),
		})
		.optional(),
});
