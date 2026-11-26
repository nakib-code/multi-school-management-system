import type { NextFunction, Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import type {
	AttendanceFilterQuery,
	BulkAttendanceInput,
	CreateAttendanceInput,
	CreateHolidayInput,
	CreateLeaveRequestInput,
	DayAttendanceQuery,
	HolidayListQuery,
	LeaveRequestFilterQuery,
	MonthlyReportQuery,
	PublishMonthlyReportInput,
	ReviewLeaveRequestInput,
	StudentCalendarQuery,
	UpdateAttendanceInput,
	UpdateAttendanceSettingsInput,
} from "./interface.js";
import {
	cancelLeaveRequest,
	createLeaveRequest,
	getLeaveRequests,
	reviewLeaveRequest,
} from "./leave.service.js";
import {
	getMonthlyAttendanceReport,
	getPublishedReportsForGuardian,
	publishMonthlyAttendanceReport,
} from "./reports.service.js";
import {
	bulkMarkAttendance,
	createAttendance,
	deleteAttendance,
	getAttendanceById,
	getAttendanceHistory,
	getAttendances,
	getDayAttendance,
	getMyLinkedStudents,
	getStudentCalendar,
	updateAttendance,
} from "./service.js";
import {
	createHoliday,
	deleteHoliday,
	getAttendanceSettings,
	getHolidays,
	updateAttendanceSettings,
} from "./settings.service.js";

const parsePositiveInt = (value: unknown, label: string): number => {
	const num = Number(value);
	if (!Number.isInteger(num) || num <= 0) {
		throw new AppError(400, `Invalid ${label}`);
	}
	return num;
};

const getValidated = <T>(res: Response): T | undefined =>
	res.locals.validatedRequest as T | undefined;

export const createAttendanceController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = getValidated<{ body?: CreateAttendanceInput }>(res);
		const result = await createAttendance(
			schoolId,
			req.user,
			validated?.body ?? req.body,
		);
		return sendResponse(res, {
			statusCode: 201,
			message: "Attendance recorded successfully",
			data: result.record,
			meta: {
				changed: result.changed,
				notifiedCount: result.notifiedCount,
			},
		});
	} catch (error) {
		next(error);
	}
};

export const bulkMarkAttendanceController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = getValidated<{ body?: BulkAttendanceInput }>(res);
		const result = await bulkMarkAttendance(
			schoolId,
			req.user,
			validated?.body ?? req.body,
		);
		return sendResponse(res, {
			statusCode: 201,
			message: "Bulk attendance recorded successfully",
			data: result.records,
			meta: {
				changedCount: result.changedCount,
				notifiedCount: result.notifiedCount,
			},
		});
	} catch (error) {
		next(error);
	}
};

export const getAttendancesController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = getValidated<{ query?: AttendanceFilterQuery }>(res);
		const result = await getAttendances(
			schoolId,
			req.user,
			validated?.query ?? {},
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Attendance records retrieved successfully",
			data: result.records,
			meta: result.meta,
		});
	} catch (error) {
		next(error);
	}
};

export const getDayAttendanceController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = getValidated<{ query: DayAttendanceQuery }>(res);
		if (!validated?.query) {
			throw new AppError(400, "Query parameters are required");
		}
		const result = await getDayAttendance(schoolId, req.user, validated.query);
		return sendResponse(res, {
			statusCode: 200,
			message: "Day attendance loaded successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getStudentCalendarController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = getValidated<{ query: StudentCalendarQuery }>(res);
		if (!validated?.query) {
			throw new AppError(400, "Query parameters are required");
		}
		const result = await getStudentCalendar(
			schoolId,
			req.user,
			validated.query,
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Student attendance calendar retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getMyLinkedStudentsController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await getMyLinkedStudents(schoolId, req.user);
		return sendResponse(res, {
			statusCode: 200,
			message: "Linked students retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getAttendanceByIdController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "attendance ID");
		const result = await getAttendanceById(schoolId, id, req.user);
		return sendResponse(res, {
			statusCode: 200,
			message: "Attendance record retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getAttendanceHistoryController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "attendance ID");
		const result = await getAttendanceHistory(schoolId, id, req.user);
		return sendResponse(res, {
			statusCode: 200,
			message: "Attendance history retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const updateAttendanceController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "attendance ID");
		const validated = getValidated<{ body?: UpdateAttendanceInput }>(res);
		const result = await updateAttendance(
			schoolId,
			id,
			req.user,
			validated?.body ?? req.body,
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Attendance record updated successfully",
			data: result.record,
			meta: {
				changed: result.changed,
				notifiedCount: result.notifiedCount,
			},
		});
	} catch (error) {
		next(error);
	}
};

export const deleteAttendanceController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "attendance ID");
		const result = await deleteAttendance(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Attendance record deleted successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

// --- Monthly Reports ---

export const getMonthlyReportController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = getValidated<{ query: MonthlyReportQuery }>(res);
		if (!validated?.query) {
			throw new AppError(400, "Query parameters are required");
		}
		const result = await getMonthlyAttendanceReport(schoolId, validated.query);
		return sendResponse(res, {
			statusCode: 200,
			message: "Monthly attendance report retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const publishMonthlyReportController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = getValidated<{ body?: PublishMonthlyReportInput }>(res);
		const result = await publishMonthlyAttendanceReport(
			schoolId,
			req.user,
			validated?.body ?? req.body,
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Monthly attendance report published successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getPublishedReportsController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = getValidated<{ query?: { studentId?: number } }>(res);
		const result = await getPublishedReportsForGuardian(
			schoolId,
			req.user,
			validated?.query?.studentId,
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Published attendance reports retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

// --- Settings & Holidays ---

export const getAttendanceSettingsController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await getAttendanceSettings(schoolId);
		return sendResponse(res, {
			statusCode: 200,
			message: "Attendance settings retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const updateAttendanceSettingsController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = getValidated<{ body?: UpdateAttendanceSettingsInput }>(
			res,
		);
		const result = await updateAttendanceSettings(
			schoolId,
			validated?.body ?? req.body,
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Attendance settings updated successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getHolidaysController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = getValidated<{ query?: HolidayListQuery }>(res);
		const result = await getHolidays(schoolId, validated?.query ?? {});
		return sendResponse(res, {
			statusCode: 200,
			message: "Holidays retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const createHolidayController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = getValidated<{ body?: CreateHolidayInput }>(res);
		const result = await createHoliday(schoolId, validated?.body ?? req.body);
		return sendResponse(res, {
			statusCode: 201,
			message: "Holiday saved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const deleteHolidayController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "holiday ID");
		const result = await deleteHoliday(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Holiday deleted successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

// --- Leave Requests ---

export const createLeaveRequestController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = getValidated<{ body?: CreateLeaveRequestInput }>(res);
		const result = await createLeaveRequest(
			schoolId,
			req.user,
			validated?.body ?? req.body,
		);
		return sendResponse(res, {
			statusCode: 201,
			message: "Leave request submitted successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getLeaveRequestsController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = getValidated<{ query?: LeaveRequestFilterQuery }>(res);
		const result = await getLeaveRequests(
			schoolId,
			req.user,
			validated?.query ?? {},
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Leave requests retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const cancelLeaveRequestController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "leave request ID");
		const result = await cancelLeaveRequest(schoolId, id, req.user);
		return sendResponse(res, {
			statusCode: 200,
			message: "Leave request cancelled successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const reviewLeaveRequestController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "leave request ID");
		const validated = getValidated<{ body?: ReviewLeaveRequestInput }>(res);
		const result = await reviewLeaveRequest(
			schoolId,
			id,
			req.user,
			validated?.body ?? req.body,
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Leave request reviewed successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};
