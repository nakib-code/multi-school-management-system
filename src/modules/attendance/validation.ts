import { z } from "zod";
import { AttendanceStatus } from "../../generated/prisma/client.js";

const schoolIdParam = z.coerce
	.number()
	.int()
	.positive("School ID must be a positive number");
const idParam = z.coerce
	.number()
	.int()
	.positive("Attendance ID must be a positive number");

export const attendanceSchoolParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			studentId: z.coerce.number().int().positive().optional(),
			enrollmentId: z.coerce.number().int().positive().optional(),
			status: z.nativeEnum(AttendanceStatus).optional(),
			fromDate: z.coerce.date().optional(),
			toDate: z.coerce.date().optional(),
		})
		.optional(),
});

export const attendanceParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
});

export const createAttendanceSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z.object({
		studentId: z.coerce.number().int().positive("Student ID is required"),
		enrollmentId: z.coerce.number().int().positive("Enrollment ID is required"),
		date: z.coerce.date(),
		status: z.nativeEnum(AttendanceStatus),
		remarks: z.string().trim().max(500).optional(),
	}),
});

export const bulkAttendanceSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z.object({
		date: z.coerce.date(),
		records: z
			.array(
				z.object({
					studentId: z.coerce.number().int().positive(),
					enrollmentId: z.coerce.number().int().positive(),
					status: z.nativeEnum(AttendanceStatus),
					remarks: z.string().trim().max(500).optional(),
				}),
			)
			.min(1, "At least one attendance record is required"),
	}),
});

export const updateAttendanceSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
	body: z
		.object({
			status: z.nativeEnum(AttendanceStatus).optional(),
			remarks: z.string().trim().max(500).nullable().optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field is required",
		}),
});
