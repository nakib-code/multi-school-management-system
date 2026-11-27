import type { NextFunction, Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import type {
	HefzDailyLogFilterQuery,
	HefzEnrollmentFilterQuery,
	HefzProgressQuery,
} from "./interface.js";
import {
	createHefzEnrollment,
	deleteHefzDailyLog,
	deleteHefzEnrollment,
	getGuardianChildrenHefzProgress,
	getHefzDailyLogById,
	getHefzDailyLogs,
	getHefzEnrollmentById,
	getHefzEnrollments,
	getStudentHefzProgress,
	updateHefzDailyLog,
	updateHefzEnrollment,
	upsertHefzDailyLog,
} from "./service.js";

const parsePositiveInt = (value: unknown, label: string): number => {
	const num = Number(value);
	if (!Number.isInteger(num) || num <= 0) {
		throw new AppError(400, `Invalid ${label}`);
	}
	return num;
};

/* ---------- Enrollments ---------- */

export const createHefzEnrollmentController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await createHefzEnrollment(schoolId, req.body);
		return sendResponse(res, {
			statusCode: 201,
			message: "Hefz/Najera enrollment created successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getHefzEnrollmentsController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = res.locals.validatedRequest as
			| { query?: HefzEnrollmentFilterQuery }
			| undefined;
		const result = await getHefzEnrollments(
			schoolId,
			validated?.query ?? {},
			req.user ? { userId: req.user.userId, role: req.user.role } : undefined,
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Hefz/Najera enrollments retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getHefzEnrollmentByIdController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "Hefz enrollment ID");
		const result = await getHefzEnrollmentById(
			schoolId,
			id,
			req.user ? { userId: req.user.userId, role: req.user.role } : undefined,
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Hefz/Najera enrollment retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const updateHefzEnrollmentController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "Hefz enrollment ID");
		const result = await updateHefzEnrollment(
			schoolId,
			id,
			req.body,
			req.user ? { userId: req.user.userId, role: req.user.role } : undefined,
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Hefz/Najera enrollment updated successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const deleteHefzEnrollmentController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "Hefz enrollment ID");
		const result = await deleteHefzEnrollment(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Hefz/Najera enrollment deleted successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

/* ---------- Daily Logs ---------- */

export const upsertHefzDailyLogController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await upsertHefzDailyLog(
			schoolId,
			req.body,
			req.user ? { userId: req.user.userId, role: req.user.role } : undefined,
		);
		return sendResponse(res, {
			statusCode: 201,
			message: "Hefz daily log saved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getHefzDailyLogsController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = res.locals.validatedRequest as
			| { query?: HefzDailyLogFilterQuery }
			| undefined;
		const result = await getHefzDailyLogs(
			schoolId,
			validated?.query ?? {},
			req.user ? { userId: req.user.userId, role: req.user.role } : undefined,
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Hefz daily logs retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getHefzDailyLogByIdController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "Hefz daily log ID");
		const result = await getHefzDailyLogById(
			schoolId,
			id,
			req.user ? { userId: req.user.userId, role: req.user.role } : undefined,
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Hefz daily log retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const updateHefzDailyLogController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "Hefz daily log ID");
		const result = await updateHefzDailyLog(
			schoolId,
			id,
			req.body,
			req.user ? { userId: req.user.userId, role: req.user.role } : undefined,
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Hefz daily log updated successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const deleteHefzDailyLogController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "Hefz daily log ID");
		const result = await deleteHefzDailyLog(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Hefz daily log deleted successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

/* ---------- Progress Reports ---------- */

export const getStudentHefzProgressController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const studentId = parsePositiveInt(req.params.studentId, "student ID");
		const validated = res.locals.validatedRequest as
			| { query?: HefzProgressQuery }
			| undefined;
		const result = await getStudentHefzProgress(
			schoolId,
			studentId,
			{ userId: req.user.userId, role: req.user.role },
			validated?.query ?? {},
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Student Hefz progress report retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getGuardianChildrenHefzProgressController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = res.locals.validatedRequest as
			| { query?: HefzProgressQuery }
			| undefined;
		const result = await getGuardianChildrenHefzProgress(
			schoolId,
			req.user.userId,
			validated?.query ?? {},
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Guardian children Hefz progress reports retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};
