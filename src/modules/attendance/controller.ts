import type { NextFunction, Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import type { AttendanceFilterQuery } from "./interface.js";
import {
	bulkMarkAttendance,
	createAttendance,
	deleteAttendance,
	getAttendanceById,
	getAttendances,
	updateAttendance,
} from "./service.js";

const parsePositiveInt = (value: unknown, label: string): number => {
	const num = Number(value);
	if (!Number.isInteger(num) || num <= 0) {
		throw new AppError(400, `Invalid ${label}`);
	}
	return num;
};

export const createAttendanceController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await createAttendance(schoolId, req.user.userId, req.body);
		return sendResponse(res, {
			statusCode: 201,
			message: "Attendance recorded successfully",
			data: result,
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
		const result = await bulkMarkAttendance(
			schoolId,
			req.user.userId,
			req.body,
		);
		return sendResponse(res, {
			statusCode: 201,
			message: "Bulk attendance recorded successfully",
			data: result,
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
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = res.locals.validatedRequest as
			| { query?: AttendanceFilterQuery }
			| undefined;
		const result = await getAttendances(schoolId, validated?.query ?? {});
		return sendResponse(res, {
			statusCode: 200,
			message: "Attendance records retrieved successfully",
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
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "attendance ID");
		const result = await getAttendanceById(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Attendance record retrieved successfully",
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
		const result = await updateAttendance(
			schoolId,
			id,
			req.user.userId,
			req.body,
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Attendance record updated successfully",
			data: result,
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
