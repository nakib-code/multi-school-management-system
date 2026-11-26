import { z } from "zod";
import {
	AttendanceStatus,
	LeaveRequestStatus,
} from "../../generated/prisma/client.js";
import {
	diffCalendarDays,
	getSchoolTodayStr,
	parseLocalDateToUtcMidnight,
} from "../../utils/attendanceDate.js";

const schoolIdParam = z.coerce
	.number()
	.int()
	.positive("School ID must be a positive number");

const idParam = z.coerce
	.number()
	.int()
	.positive("ID must be a positive number");

const localDateString = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
	.refine(
		(val) => {
			try {
				parseLocalDateToUtcMidnight(val);
				return true;
			} catch {
				return false;
			}
		},
		{ message: "Invalid calendar date" },
	);

const monthString = z
	.string()
	.trim()
	.regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be in YYYY-MM format");

const optionalDateParam = z
	.union([localDateString, z.string().datetime()])
	.transform((val) => val.slice(0, 10));

export const attendanceSchoolParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			studentId: z.coerce.number().int().positive().optional(),
			enrollmentId: z.coerce.number().int().positive().optional(),
			classId: z.coerce.number().int().positive().optional(),
			sectionId: z.coerce.number().int().positive().optional(),
			status: z.nativeEnum(AttendanceStatus).optional(),
			fromDate: optionalDateParam.optional(),
			toDate: optionalDateParam.optional(),
			search: z.string().trim().max(100).optional(),
			page: z.coerce.number().int().min(1).optional(),
			pageSize: z.coerce.number().int().min(1).max(200).optional(),
		})
		.optional(),
});

export const attendanceParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
});

export const dayAttendanceQuerySchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z.object({
		classId: z.coerce.number().int().positive().optional(),
		sectionId: z.coerce.number().int().positive().optional(),
		date: localDateString,
	}),
});

export const studentCalendarQuerySchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z.object({
		studentId: z.coerce.number().int().positive().optional(),
		month: monthString,
	}),
});

export const createAttendanceSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z
		.object({
			studentId: z.coerce.number().int().positive("Student ID is required"),
			enrollmentId: z.coerce
				.number()
				.int()
				.positive("Enrollment ID is required"),
			date: optionalDateParam,
			status: z.nativeEnum(AttendanceStatus),
			remarks: z.string().trim().max(500).optional(),
		})
		.superRefine((data, ctx) => {
			if (data.status === "EXCUSED" && !data.remarks?.trim()) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["remarks"],
					message: "Remarks are required when marking a student as EXCUSED",
				});
			}
		}),
});

export const bulkAttendanceSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z.object({
		date: optionalDateParam,
		records: z
			.array(
				z
					.object({
						studentId: z.coerce.number().int().positive(),
						enrollmentId: z.coerce.number().int().positive(),
						status: z.nativeEnum(AttendanceStatus),
						remarks: z.string().trim().max(500).optional(),
					})
					.superRefine((rec, ctx) => {
						if (rec.status === "EXCUSED" && !rec.remarks?.trim()) {
							ctx.addIssue({
								code: z.ZodIssueCode.custom,
								path: ["remarks"],
								message: "Remarks are required for EXCUSED status",
							});
						}
					}),
			)
			.min(1, "At least one attendance record is required")
			.max(300, "Maximum 300 records per bulk request"),
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

export const monthlyReportQuerySchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z.object({
		month: monthString,
		classId: z.coerce.number().int().positive("Class ID is required"),
		sectionId: z.coerce.number().int().positive().optional(),
	}),
});

export const publishMonthlyReportSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z.object({
		month: monthString,
		classId: z.coerce.number().int().positive("Class ID is required"),
		sectionId: z.coerce.number().int().positive().optional(),
	}),
});

export const publishedReportsQuerySchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			studentId: z.coerce.number().int().positive().optional(),
		})
		.optional(),
});

export const updateAttendanceSettingsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z.object({
		weeklyOffDays: z
			.array(z.coerce.number().int().min(0).max(6))
			.max(6, "At least one day of the week must remain a working day")
			.transform((days) => Array.from(new Set(days)).sort((a, b) => a - b)),
	}),
});

export const holidayListQuerySchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			month: monthString.optional(),
			year: z.coerce.number().int().min(2000).max(2100).optional(),
		})
		.optional(),
});

export const createHolidaySchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z.object({
		date: localDateString,
		title: z
			.string()
			.trim()
			.min(2, "Holiday title must be at least 2 characters")
			.max(120),
	}),
});

export const createLeaveRequestSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z
		.object({
			studentId: z.coerce.number().int().positive("Student is required"),
			fromDate: localDateString,
			toDate: localDateString,
			reason: z
				.string()
				.trim()
				.min(3, "Please provide a brief reason for leave")
				.max(500),
		})
		.superRefine((data, ctx) => {
			const today = getSchoolTodayStr();
			if (diffCalendarDays(data.fromDate, today) < 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["fromDate"],
					message: "Leave start date must be today or in the future",
				});
			}
			const span = diffCalendarDays(data.toDate, data.fromDate);
			if (span < 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["toDate"],
					message: "End date must be on or after start date",
				});
			} else if (span > 29) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["toDate"],
					message: "Leave request cannot exceed 30 days",
				});
			}
		}),
});

export const leaveRequestListQuerySchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			status: z.nativeEnum(LeaveRequestStatus).optional(),
			studentId: z.coerce.number().int().positive().optional(),
			classId: z.coerce.number().int().positive().optional(),
			sectionId: z.coerce.number().int().positive().optional(),
		})
		.optional(),
});

export const reviewLeaveRequestSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
	body: z.object({
		status: z.enum(["APPROVED", "REJECTED"]),
		reviewNote: z.string().trim().max(500).optional(),
	}),
});
