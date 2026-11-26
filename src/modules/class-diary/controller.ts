import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import type { ClassDiaryFilterQuery } from "./interface.js";
import {
	createClassDiary,
	deleteClassDiary,
	getClassDiaries,
	getClassDiaryById,
	updateClassDiary,
} from "./service.js";

const parsePositiveInt = (value: unknown, label: string): number => {
	const num = Number(value);
	if (!Number.isInteger(num) || num <= 0) {
		throw new AppError(400, `Invalid ${label}`);
	}
	return num;
};

export const createClassDiaryController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await createClassDiary(schoolId, req.user, req.body);
		return sendResponse(res, {
			statusCode: 201,
			message: "Daily class diary posted successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getClassDiariesController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = res.locals.validatedRequest as
			| { query?: ClassDiaryFilterQuery }
			| undefined;
		const result = await getClassDiaries(
			schoolId,
			req.user,
			validated?.query ?? {},
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Class diaries retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getClassDiaryByIdController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "diary ID");
		const result = await getClassDiaryById(schoolId, id, req.user);
		return sendResponse(res, {
			statusCode: 200,
			message: "Class diary retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const updateClassDiaryController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "diary ID");
		const result = await updateClassDiary(schoolId, id, req.user, req.body);
		return sendResponse(res, {
			statusCode: 200,
			message: "Class diary updated successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const deleteClassDiaryController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "diary ID");
		const result = await deleteClassDiary(schoolId, id, req.user);
		return sendResponse(res, {
			statusCode: 200,
			message: "Class diary deleted successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};
